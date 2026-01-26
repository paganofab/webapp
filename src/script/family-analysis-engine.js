/**
 * Comprehensive Family Analysis Engine
 * 
 * This module implements the systematic pedigree analysis methodology
 * to generate detailed family reports for display in the family center.
 * 
 * Based on the 6-step analysis framework:
 * 1. Basic Family Overview
 * 2. Partnership Structure Analysis  
 * 3. Parent-Child Relationship Mapping
 * 4. Proband-Centric Analysis
 * 5. Complex Relationship Detection
 * 6. Comprehensive Family Summary Generation
 */

class FamilyAnalysisEngine {
    constructor(database) {
        this.db = database;
    }

    /**
     * Generate comprehensive family analysis report
     * @param {number} pedigreeId - The pedigree ID to analyze
     * @returns {Object} Complete family analysis report
     */
    async generateFamilyReport(pedigreeId) {
        try {
            const report = {
                pedigreeId: pedigreeId,
                timestamp: new Date().toISOString(),
                basicOverview: await this.getBasicOverview(pedigreeId),
                partnershipStructure: await this.getPartnershipStructure(pedigreeId),
                parentChildRelationships: await this.getParentChildRelationships(pedigreeId),
                probandAnalysis: await this.getProbandAnalysis(pedigreeId),
                complexRelationships: await this.getComplexRelationships(pedigreeId),
                familySummary: await this.getFamilySummary(pedigreeId),
                familyNarrative: await this.generateFamilyNarrative(pedigreeId)
            };

            return report;
        } catch (error) {
            console.error('Error generating family report:', error);
            throw error;
        }
    }

    /**
     * Step 1: Basic Family Overview
     */
    async getBasicOverview(pedigreeId) {
        const query = `
            SELECT 
                pedigree_id,
                id,
                external_id,
                f_name,
                l_name,
                gender,
                generation
            FROM pedigree_import_person 
            WHERE pedigree_id = ?
            ORDER BY generation, id
        `;

        const people = this.db.prepare(query).all(pedigreeId);
        
        const overview = {
            totalPeople: people.length,
            generations: [...new Set(people.map(p => p.generation))].sort(),
            genderDistribution: {
                male: people.filter(p => p.gender === 'M').length,
                female: people.filter(p => p.gender === 'F').length,
                unknown: people.filter(p => !p.gender || (p.gender !== 'M' && p.gender !== 'F')).length
            },
            proband: people.find(p => p.external_id === '0.0'),
            people: people
        };

        return overview;
    }

    /**
     * Step 2: Partnership Structure Analysis
     */
    async getPartnershipStructure(pedigreeId) {
        const query = `
            SELECT 
                pt.id AS partnership_id,
                pt.consanguinity,
                pt.is_broken,
                GROUP_CONCAT(p.f_name || ' (' || p.gender || ', ID:' || p.id || ')', ' + ') AS partners,
                COUNT(p.id) AS partner_count
            FROM pedigree_import_partnership pt
            JOIN pedigree_import_partnership_partner pp ON pp.partnership_id = pt.id
            JOIN pedigree_import_person p ON p.id = pp.person_id
            WHERE pt.pedigree_id = ?
            GROUP BY pt.id
            ORDER BY pt.id
        `;

        const partnerships = this.db.prepare(query).all(pedigreeId);
        
        const structure = {
            totalPartnerships: partnerships.length,
            consanguineousCount: partnerships.filter(p => p.consanguinity).length,
            brokenPartnerships: partnerships.filter(p => p.is_broken === 1).length,
            partnerships: partnerships.map(p => ({
                id: p.partnership_id,
                partners: p.partners,
                partnerCount: p.partner_count,
                isConsanguineous: !!p.consanguinity,
                isBroken: p.is_broken === 1,
                consanguinityType: p.consanguinity
            }))
        };

        return structure;
    }

    /**
     * Step 3: Parent-Child Relationship Mapping
     */
    async getParentChildRelationships(pedigreeId) {
        // Children per partnership
        const childrenQuery = `
            SELECT 
                pt.id AS partnership_id,
                GROUP_CONCAT(c.f_name || ' (ID:' || c.id || ', Gen:' || c.generation || ')', ', ') AS children,
                COUNT(c.id) AS children_count
            FROM pedigree_import_partnership pt
            LEFT JOIN pedigree_import_partnership_child pc ON pc.partnership_id = pt.id
            LEFT JOIN pedigree_import_person c ON c.id = pc.child_id
            WHERE pt.pedigree_id = ?
            GROUP BY pt.id
            ORDER BY pt.id
        `;

        // Parents of each person
        const parentsQuery = `
            SELECT 
                child.id AS child_id,
                child.f_name AS child_name,
                child.generation AS child_generation,
                GROUP_CONCAT(parent.f_name || ' (' || parent.gender || ')', ' + ') AS parents,
                pt.id AS partnership_id,
                COUNT(parent.id) AS parent_count
            FROM pedigree_import_partnership_child pc
            JOIN pedigree_import_partnership pt ON pt.id = pc.partnership_id
            JOIN pedigree_import_partnership_partner pp ON pp.partnership_id = pt.id
            JOIN pedigree_import_person parent ON parent.id = pp.person_id
            JOIN pedigree_import_person child ON child.id = pc.child_id
            WHERE pt.pedigree_id = ?
            GROUP BY child.id
            ORDER BY child.generation, child.f_name
        `;

        const childrenPerPartnership = this.db.prepare(childrenQuery).all(pedigreeId);
        const parentsPerChild = this.db.prepare(parentsQuery).all(pedigreeId);

        return {
            childrenPerPartnership: childrenPerPartnership.map(cp => ({
                partnershipId: cp.partnership_id,
                childrenCount: cp.children_count || 0,
                children: cp.children || 'None'
            })),
            parentsPerChild: parentsPerChild.map(pc => ({
                childId: pc.child_id,
                childName: pc.child_name,
                generation: pc.child_generation,
                parents: pc.parents,
                parentCount: pc.parent_count,
                partnershipId: pc.partnership_id
            })),
            averageChildrenPerPartnership: childrenPerPartnership.reduce((sum, cp) => sum + (cp.children_count || 0), 0) / childrenPerPartnership.length
        };
    }

    /**
     * Step 4: Proband-Centric Analysis
     */
    async getProbandAnalysis(pedigreeId) {
        const query = `
            WITH probands AS (
                SELECT pedigree_id, id, f_name, generation AS proband_generation
                FROM pedigree_import_person 
                WHERE external_id = '0.0' AND pedigree_id = ?
            )
            SELECT 
                p.pedigree_id,
                pr.f_name AS proband_name,
                pr.proband_generation,
                CASE 
                    WHEN p.generation < pr.proband_generation THEN 'ANCESTORS'
                    WHEN p.generation = pr.proband_generation THEN 'SAME_LEVEL'
                    WHEN p.generation > pr.proband_generation THEN 'DESCENDANTS'
                END AS relationship_to_proband,
                p.generation,
                p.id,
                p.f_name,
                (p.generation - pr.proband_generation) AS generation_difference
            FROM pedigree_import_person p
            JOIN probands pr ON pr.pedigree_id = p.pedigree_id
            ORDER BY p.generation, p.id
        `;

        const probandAnalysis = this.db.prepare(query).all(pedigreeId);
        
        const proband = probandAnalysis.find(p => p.generation_difference === 0);
        const ancestors = probandAnalysis.filter(p => p.relationship_to_proband === 'ANCESTORS');
        const sameLevel = probandAnalysis.filter(p => p.relationship_to_proband === 'SAME_LEVEL');
        const descendants = probandAnalysis.filter(p => p.relationship_to_proband === 'DESCENDANTS');

        return {
            proband: proband ? {
                name: proband.proband_name,
                generation: proband.proband_generation,
                id: proband.id
            } : null,
            generationalDistribution: {
                ancestors: {
                    count: ancestors.length,
                    people: ancestors.map(a => ({ name: a.f_name, generation: a.generation, generationsAbove: Math.abs(a.generation_difference) }))
                },
                sameLevel: {
                    count: sameLevel.length,
                    people: sameLevel.map(s => ({ name: s.f_name, generation: s.generation, isProbandSibling: s.id !== proband?.id }))
                },
                descendants: {
                    count: descendants.length,
                    people: descendants.map(d => ({ name: d.f_name, generation: d.generation, generationsBelow: d.generation_difference }))
                }
            }
        };
    }

    /**
     * Step 5: Complex Relationship Detection
     */
    async getComplexRelationships(pedigreeId) {
        // Multiple partnerships detection
        const multiplePartnershipsQuery = `
            SELECT 
                p.id,
                p.f_name,
                p.gender,
                COUNT(DISTINCT pp.partnership_id) AS partnership_count,
                GROUP_CONCAT(DISTINCT 'Partnership ' || pt.id || 
                    CASE WHEN pt.is_broken = 1 THEN ' (broken)' ELSE ' (active)' END
                ) AS partnerships
            FROM pedigree_import_person p
            JOIN pedigree_import_partnership_partner pp ON pp.person_id = p.id
            JOIN pedigree_import_partnership pt ON pt.id = pp.partnership_id
            WHERE p.pedigree_id = ?
            GROUP BY p.id
            HAVING partnership_count > 1
            ORDER BY partnership_count DESC, p.f_name
        `;

        // Half-sibling identification
        const halfSiblingsQuery = `
            WITH person_parents AS (
                SELECT 
                    pc.child_id,
                    child.f_name AS child_name,
                    pp.person_id AS parent_id,
                    parent.f_name AS parent_name,
                    parent.gender AS parent_gender
                FROM pedigree_import_partnership_child pc
                JOIN pedigree_import_partnership pt ON pt.id = pc.partnership_id
                JOIN pedigree_import_partnership_partner pp ON pp.partnership_id = pt.id
                JOIN pedigree_import_person parent ON parent.id = pp.person_id
                JOIN pedigree_import_person child ON child.id = pc.child_id
                WHERE pt.pedigree_id = ?
            ),
            shared_parents AS (
                SELECT 
                    p1.child_id AS person1_id,
                    p1.child_name AS person1_name,
                    p2.child_id AS person2_id, 
                    p2.child_name AS person2_name,
                    COUNT(*) AS shared_parent_count,
                    GROUP_CONCAT(p1.parent_name || ' (' || p1.parent_gender || ')', ', ') AS shared_parents
                FROM person_parents p1
                JOIN person_parents p2 ON p1.parent_id = p2.parent_id
                WHERE p1.child_id < p2.child_id
                GROUP BY p1.child_id, p2.child_id
            )
            SELECT 
                person1_name,
                person2_name,
                shared_parent_count,
                shared_parents,
                CASE 
                    WHEN shared_parent_count = 1 THEN 'Half-siblings'
                    WHEN shared_parent_count = 2 THEN 'Full siblings'
                    ELSE 'Multiple shared parents'
                END AS relationship_type
            FROM shared_parents
            ORDER BY shared_parent_count DESC, person1_name
        `;

        const multiplePartnerships = this.db.prepare(multiplePartnershipsQuery).all(pedigreeId);
        const siblingRelationships = this.db.prepare(halfSiblingsQuery).all(pedigreeId);

        return {
            multiplePartnerships: multiplePartnerships.map(mp => ({
                personId: mp.id,
                name: mp.f_name,
                gender: mp.gender,
                partnershipCount: mp.partnership_count,
                partnerships: mp.partnerships
            })),
            siblingRelationships: siblingRelationships.map(sr => ({
                person1: sr.person1_name,
                person2: sr.person2_name,
                relationshipType: sr.relationship_type,
                sharedParents: sr.shared_parents,
                sharedParentCount: sr.shared_parent_count
            })),
            complexityIndicators: {
                hasMultiplePartnerships: multiplePartnerships.length > 0,
                hasHalfSiblings: siblingRelationships.some(sr => sr.relationship_type === 'Half-siblings'),
                hasConsanguineousMarriages: false // Will be filled by partnership analysis
            }
        };
    }

    /**
     * Step 6: Comprehensive Family Summary Generation
     */
    async getFamilySummary(pedigreeId) {
        const generationSummaryQuery = `
            WITH generation_summary AS (
                SELECT 
                    generation,
                    COUNT(*) as person_count,
                    GROUP_CONCAT(f_name, ', ') as people_list,
                    COUNT(CASE WHEN gender = 'M' THEN 1 END) as males,
                    COUNT(CASE WHEN gender = 'F' THEN 1 END) as females
                FROM pedigree_import_person
                WHERE pedigree_id = ?
                GROUP BY generation
            ),
            proband_info AS (
                SELECT generation as proband_generation 
                FROM pedigree_import_person 
                WHERE external_id = '0.0' AND pedigree_id = ?
            )
            SELECT 
                gs.generation,
                CASE 
                    WHEN gs.generation < pi.proband_generation THEN 'Ancestors'
                    WHEN gs.generation = pi.proband_generation THEN 'Proband Level'
                    ELSE 'Descendants'
                END AS relationship_to_proband,
                gs.person_count,
                gs.males,
                gs.females,
                gs.people_list
            FROM generation_summary gs
            CROSS JOIN proband_info pi
            ORDER BY gs.generation
        `;

        const keyMetricsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM pedigree_import_partnership WHERE pedigree_id = ?) as total_partnerships,
                (SELECT COUNT(*) FROM pedigree_import_partnership WHERE pedigree_id = ? AND consanguinity IS NOT NULL) as consanguineous_partnerships,
                (SELECT COUNT(*) FROM pedigree_import_partnership WHERE pedigree_id = ? AND is_broken = 1) as broken_partnerships,
                (SELECT AVG(child_count) FROM (
                    SELECT pt.id, COUNT(pc.child_id) as child_count
                    FROM pedigree_import_partnership pt
                    LEFT JOIN pedigree_import_partnership_child pc ON pc.partnership_id = pt.id
                    WHERE pt.pedigree_id = ?
                    GROUP BY pt.id
                )) as avg_children_per_partnership
        `;

        const generationData = this.db.prepare(generationSummaryQuery).all(pedigreeId, pedigreeId);
        const metricsData = this.db.prepare(keyMetricsQuery).get(pedigreeId, pedigreeId, pedigreeId, pedigreeId);

        return {
            generationalBreakdown: generationData.map(gd => ({
                generation: gd.generation,
                relationshipToProband: gd.relationship_to_proband,
                totalPeople: gd.person_count,
                demographics: {
                    males: gd.males,
                    females: gd.females,
                    ratio: gd.males > 0 ? (gd.females / gd.males).toFixed(2) : 'N/A'
                },
                people: gd.people_list
            })),
            keyMetrics: {
                totalPartnerships: metricsData.total_partnerships,
                consanguineousPartnerships: metricsData.consanguineous_partnerships,
                brokenPartnerships: metricsData.broken_partnerships,
                averageChildrenPerPartnership: metricsData.avg_children_per_partnership ? 
                    Math.round(metricsData.avg_children_per_partnership * 10) / 10 : 0
            }
        };
    }

    /**
     * Generate narrative summary of the family structure
     */
    async generateFamilyNarrative(pedigreeId) {
        // Get all the analysis data
        const overview = await this.getBasicOverview(pedigreeId);
        const partnerships = await this.getPartnershipStructure(pedigreeId);
        const relationships = await this.getComplexRelationships(pedigreeId);
        const probandAnalysis = await this.getProbandAnalysis(pedigreeId);

        let narrative = [];

        // Basic family structure
        const generations = overview.generations;
        narrative.push(`This family spans ${generations.length} generation${generations.length === 1 ? '' : 's'} (${generations.join(', ')}) with ${overview.totalPeople} total individuals.`);

        // Proband information
        if (probandAnalysis.proband) {
            narrative.push(`The proband is ${probandAnalysis.proband.name} at Generation ${probandAnalysis.proband.generation}.`);
        }

        // Partnership complexity
        if (partnerships.totalPartnerships > 0) {
            let partnershipDescription = `The family includes ${partnerships.totalPartnerships} partnership${partnerships.totalPartnerships === 1 ? '' : 's'}`;
            
            if (partnerships.consanguineousCount > 0) {
                partnershipDescription += ` (${partnerships.consanguineousCount} consanguineous)`;
            }
            
            if (partnerships.brokenPartnerships > 0) {
                partnershipDescription += ` with ${partnerships.brokenPartnerships} ended relationship${partnerships.brokenPartnerships === 1 ? '' : 's'}`;
            }
            
            narrative.push(partnershipDescription + '.');
        }

        // Complex relationships
        if (relationships.multiplePartnerships.length > 0) {
            const multiPartnerNames = relationships.multiplePartnerships.map(mp => mp.name).join(', ');
            narrative.push(`${multiPartnerNames} ${relationships.multiplePartnerships.length === 1 ? 'has' : 'have'} had multiple partnerships, creating a blended family structure.`);
        }

        if (relationships.siblingRelationships.length > 0) {
            const halfSiblings = relationships.siblingRelationships.filter(sr => sr.relationshipType === 'Half-siblings');
            if (halfSiblings.length > 0) {
                const halfSiblingPairs = halfSiblings.map(hs => `${hs.person1} and ${hs.person2} (shared parent: ${hs.sharedParents})`);
                narrative.push(`Half-sibling relationships exist between: ${halfSiblingPairs.join('; ')}.`);
            }
        }

        // Gender distribution
        const genderRatio = overview.genderDistribution.female / overview.genderDistribution.male;
        const genderDescription = `Gender distribution: ${overview.genderDistribution.male} male, ${overview.genderDistribution.female} female` +
            (overview.genderDistribution.unknown > 0 ? `, ${overview.genderDistribution.unknown} unknown` : '') +
            ` (ratio: ${genderRatio.toFixed(2)}:1 F:M).`;
        narrative.push(genderDescription);

        return {
            summary: narrative.join(' '),
            sections: narrative,
            keyInsights: this.extractKeyInsights(overview, partnerships, relationships, probandAnalysis)
        };
    }

    /**
     * Extract key insights for quick reference
     */
    extractKeyInsights(overview, partnerships, relationships, probandAnalysis) {
        const insights = [];

        // Family complexity
        if (relationships.multiplePartnerships.length > 0) {
            insights.push({
                type: 'complexity',
                title: 'Blended Family Structure',
                description: `${relationships.multiplePartnerships.length} individual(s) with multiple partnerships create complex family dynamics.`
            });
        }

        // Half-sibling networks
        const halfSiblings = relationships.siblingRelationships.filter(sr => sr.relationshipType === 'Half-siblings');
        if (halfSiblings.length > 0) {
            insights.push({
                type: 'relationship',
                title: 'Half-Sibling Networks',
                description: `${halfSiblings.length} half-sibling relationship(s) indicate shared genetic inheritance patterns.`
            });
        }

        // Consanguineous marriages
        if (partnerships.consanguineousCount > 0) {
            insights.push({
                type: 'genetics',
                title: 'Consanguineous Relationships',
                description: `${partnerships.consanguineousCount} blood-relative marriage(s) may affect genetic risk assessment.`
            });
        }

        // Generation span
        if (overview.generations.length > 3) {
            insights.push({
                type: 'scope',
                title: 'Multi-Generational Family',
                description: `Spans ${overview.generations.length} generations, providing extensive genetic and medical history context.`
            });
        }

        return insights;
    }

    /**
     * Generate HTML report for family center display
     */
    generateHTMLReport(analysisReport) {
        const html = `
            <div class="family-analysis-report">
                <div class="report-header">
                    <h3>Comprehensive Family Analysis</h3>
                    <div class="report-meta">
                        <span>Pedigree ID: ${analysisReport.pedigreeId}</span>
                        <span>Generated: ${new Date(analysisReport.timestamp).toLocaleString()}</span>
                    </div>
                </div>

                <div class="family-summary">
                    <h4>Family Summary</h4>
                    <p class="narrative">${analysisReport.familyNarrative.summary}</p>
                </div>

                <div class="key-insights">
                    <h4>Key Insights</h4>
                    <div class="insights-grid">
                        ${analysisReport.familyNarrative.keyInsights.map(insight => `
                            <div class="insight-card ${insight.type}">
                                <h5>${insight.title}</h5>
                                <p>${insight.description}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="detailed-analysis">
                    <div class="analysis-section">
                        <h4>Generational Breakdown</h4>
                        <div class="generation-table">
                            ${analysisReport.familySummary.generationalBreakdown.map(gen => `
                                <div class="generation-row">
                                    <div class="generation-label">Generation ${gen.generation}</div>
                                    <div class="generation-info">
                                        <span class="relationship">${gen.relationshipToProband}</span>
                                        <span class="count">${gen.totalPeople} people</span>
                                        <span class="demographics">(${gen.demographics.males}M, ${gen.demographics.females}F)</span>
                                    </div>
                                    <div class="people-list">${gen.people}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="analysis-section">
                        <h4>Partnership Structure</h4>
                        <div class="partnership-summary">
                            <div class="metric">Total Partnerships: ${analysisReport.partnershipStructure.totalPartnerships}</div>
                            <div class="metric">Consanguineous: ${analysisReport.partnershipStructure.consanguineousCount}</div>
                            <div class="metric">Ended Relationships: ${analysisReport.partnershipStructure.brokenPartnerships}</div>
                        </div>
                        <div class="partnership-list">
                            ${analysisReport.partnershipStructure.partnerships.map(p => `
                                <div class="partnership-item ${p.isBroken ? 'broken' : ''} ${p.isConsanguineous ? 'consanguineous' : ''}">
                                    <span class="partners">${p.partners}</span>
                                    ${p.isConsanguineous ? '<span class="tag consanguineous">Blood relatives</span>' : ''}
                                    ${p.isBroken ? '<span class="tag broken">Ended</span>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    ${analysisReport.complexRelationships.siblingRelationships.length > 0 ? `
                        <div class="analysis-section">
                            <h4>Sibling Relationships</h4>
                            <div class="sibling-list">
                                ${analysisReport.complexRelationships.siblingRelationships.map(sr => `
                                    <div class="sibling-relationship ${sr.relationshipType.toLowerCase().replace(/[^a-z]/g, '-')}">
                                        <span class="siblings">${sr.person1} & ${sr.person2}</span>
                                        <span class="relationship-type">${sr.relationshipType}</span>
                                        <span class="shared-parents">Shared: ${sr.sharedParents}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Generate CSS styles for the HTML report
     */
    getReportCSS() {
        return `
            .family-analysis-report {
                font-family: Arial, sans-serif;
                max-width: 100%;
                margin: 0;
                padding: 20px;
                background: #fff;
            }

            .report-header {
                border-bottom: 2px solid #007cba;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }

            .report-header h3 {
                margin: 0 0 10px 0;
                color: #007cba;
                font-size: 1.5em;
            }

            .report-meta {
                font-size: 0.9em;
                color: #666;
            }

            .report-meta span {
                margin-right: 20px;
            }

            .family-summary {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                border-left: 4px solid #007cba;
            }

            .narrative {
                font-size: 1.1em;
                line-height: 1.6;
                margin: 0;
            }

            .key-insights {
                margin-bottom: 25px;
            }

            .insights-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
                margin-top: 10px;
            }

            .insight-card {
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #ccc;
            }

            .insight-card.complexity { border-left-color: #ff6b6b; background: #fff5f5; }
            .insight-card.relationship { border-left-color: #4ecdc4; background: #f0fdfc; }
            .insight-card.genetics { border-left-color: #45b7d1; background: #f0f9ff; }
            .insight-card.scope { border-left-color: #96ceb4; background: #f0fdf4; }

            .insight-card h5 {
                margin: 0 0 8px 0;
                font-size: 1em;
                font-weight: 600;
            }

            .insight-card p {
                margin: 0;
                font-size: 0.9em;
                color: #555;
            }

            .analysis-section {
                margin-bottom: 25px;
                border: 1px solid #e5e5e5;
                border-radius: 8px;
                overflow: hidden;
            }

            .analysis-section h4 {
                margin: 0;
                padding: 15px;
                background: #f8f9fa;
                border-bottom: 1px solid #e5e5e5;
                font-size: 1.1em;
                color: #333;
            }

            .generation-table, .partnership-list, .sibling-list {
                padding: 15px;
            }

            .generation-row {
                display: grid;
                grid-template-columns: 150px 200px 1fr;
                gap: 15px;
                padding: 10px 0;
                border-bottom: 1px solid #f0f0f0;
                align-items: start;
            }

            .generation-row:last-child {
                border-bottom: none;
            }

            .generation-label {
                font-weight: 600;
                color: #007cba;
            }

            .generation-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .relationship {
                font-size: 0.9em;
                color: #666;
                text-transform: uppercase;
                font-weight: 500;
            }

            .count, .demographics {
                font-size: 0.85em;
                color: #777;
            }

            .people-list {
                font-size: 0.9em;
                line-height: 1.4;
            }

            .partnership-summary {
                display: flex;
                gap: 20px;
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 1px solid #f0f0f0;
            }

            .metric {
                font-size: 0.9em;
                color: #666;
            }

            .partnership-item, .sibling-relationship {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px;
                margin-bottom: 8px;
                background: #f8f9fa;
                border-radius: 6px;
            }

            .partnership-item.broken {
                background: #fff5f5;
                border-left: 3px solid #ff6b6b;
            }

            .partnership-item.consanguineous {
                background: #f0f9ff;
                border-left: 3px solid #45b7d1;
            }

            .partners, .siblings {
                font-weight: 500;
                flex: 1;
            }

            .tag {
                font-size: 0.75em;
                padding: 3px 8px;
                border-radius: 12px;
                text-transform: uppercase;
                font-weight: 600;
            }

            .tag.consanguineous {
                background: #45b7d1;
                color: white;
            }

            .tag.broken {
                background: #ff6b6b;
                color: white;
            }

            .relationship-type {
                font-size: 0.85em;
                color: #007cba;
                font-weight: 500;
            }

            .shared-parents {
                font-size: 0.8em;
                color: #666;
                font-style: italic;
            }

            .sibling-relationship.half-siblings {
                background: #f0fdfc;
                border-left: 3px solid #4ecdc4;
            }

            .sibling-relationship.full-siblings {
                background: #f0fdf4;
                border-left: 3px solid #96ceb4;
            }

            @media (max-width: 768px) {
                .generation-row {
                    grid-template-columns: 1fr;
                    gap: 8px;
                }
                
                .insights-grid {
                    grid-template-columns: 1fr;
                }
                
                .partnership-summary {
                    flex-direction: column;
                    gap: 8px;
                }
            }
        `;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FamilyAnalysisEngine;
} else if (typeof window !== 'undefined') {
    window.FamilyAnalysisEngine = FamilyAnalysisEngine;
}
