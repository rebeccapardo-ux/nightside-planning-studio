import { para, heading, ResourcesPanel } from './shared'

// Deathcare Overview band content — reflowed verbatim from /app/learn/deathcare
// ("Why this matters" two-column body + province-resources panel) into the band's
// single reading column. Don't regenerate; reflow only.
export default function DeathcareLearnContent() {
  return (
    <div>
      <h2 style={{ ...heading, marginTop: 0 }}>Why this matters</h2>
      <p style={para}>Many people don&rsquo;t realize how many options exist for body disposition, or assume decisions will be straightforward. In reality, choices are often shaped by default practices, family expectations, or logistical constraints.</p>
      <p style={para}>Planning ahead ensures your choices reflect your values&mdash;spiritual, environmental, cultural, or personal&mdash;and reduces stress for loved ones.</p>
      <p style={para}>You may also want to consider whether there are elements you&rsquo;d like included in your final resting place, such as meaningful personal items, where possible.</p>
      <p style={para}><strong style={{ fontWeight: 600 }}>Options for body disposition vary across provinces.</strong> For example, green burial and aquamation may not be available everywhere, and provincial laws may regulate burial locations or ashes scattering. Organ and tissue donation must also be registered with provincial registries.</p>
      <p style={para}>Without clear documentation, your preferences may not be carried out as intended. Your wishes should be documented in your will to ensure they are legally recognized.</p>
      <p style={{ ...para, marginBottom: 0 }}>Understanding what&rsquo;s possible and documenting your choices clearly helps ensure your preferences will be respected.</p>

      <ResourcesPanel title="Explore province-specific resources" href="https://thenightside.net/resources">
        Legal requirements and available options vary by province. Review guidance, templates, and legal information for your province to help you document and finalize your plans.
      </ResourcesPanel>
    </div>
  )
}
