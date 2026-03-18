"use client"

import { useState } from "react"
import type { Charsheet } from "@/app/c/[id]/page"

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const
const ABILITY_LABELS: Record<string, string> = {
  str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA",
}
const SAVING_THROW_LABELS: Record<string, string> = {
  str: "Strength", dex: "Dexterity", con: "Constitution",
  int: "Intelligence", wis: "Wisdom", cha: "Charisma",
}
const SKILLS: { name: string; ability: string; label: string }[] = [
  { name: "acrobatics", ability: "dex", label: "Acrobatics" },
  { name: "animal_handling", ability: "wis", label: "Animal Handling" },
  { name: "arcana", ability: "int", label: "Arcana" },
  { name: "athletics", ability: "str", label: "Athletics" },
  { name: "deception", ability: "cha", label: "Deception" },
  { name: "history", ability: "int", label: "History" },
  { name: "insight", ability: "wis", label: "Insight" },
  { name: "intimidation", ability: "cha", label: "Intimidation" },
  { name: "investigation", ability: "int", label: "Investigation" },
  { name: "medicine", ability: "wis", label: "Medicine" },
  { name: "nature", ability: "int", label: "Nature" },
  { name: "perception", ability: "wis", label: "Perception" },
  { name: "performance", ability: "cha", label: "Performance" },
  { name: "persuasion", ability: "cha", label: "Persuasion" },
  { name: "religion", ability: "int", label: "Religion" },
  { name: "sleight_of_hand", ability: "dex", label: "Sleight of Hand" },
  { name: "stealth", ability: "dex", label: "Stealth" },
  { name: "survival", ability: "wis", label: "Survival" },
]
const FACTION_LABELS: Record<string, string> = {
  the_vigil: "The Vigil",
  the_harvesters: "The Harvesters",
  the_ossuary: "The Ossuary",
  the_quiet: "The Quiet",
  the_ascending: "The Ascending",
}
const FACTION_TIER_NAMES: Record<number, string> = {
  [-1]: "Hostile", 0: "Stranger", 1: "Acquainted",
  2: "Trusted", 3: "Devoted", 4: "Exalted",
}

function mod(score: number): string {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

function skillMod(cs: Charsheet, skill: { name: string; ability: string }): string {
  const base = Math.floor(((cs[skill.ability as keyof Charsheet] as number) - 10) / 2)
  const isExpert = cs.expertise_skills?.includes(skill.name)
  const isProf = cs.skill_proficiencies?.includes(skill.name) || isExpert
  const bonus = isExpert ? cs.proficiency_bonus * 2 : isProf ? cs.proficiency_bonus : 0
  const total = base + bonus
  return total >= 0 ? `+${total}` : `${total}`
}

function saveMod(cs: Charsheet, ability: string): string {
  const base = Math.floor(((cs[ability as keyof Charsheet] as number) - 10) / 2)
  const isProf = cs.saving_throw_proficiencies?.includes(ability)
  const total = base + (isProf ? cs.proficiency_bonus : 0)
  return total >= 0 ? `+${total}` : `${total}`
}

interface Props {
  characterName: string
  charsheet: Charsheet | null
}

const RACE_DISPLAY: Record<string, string> = {
  half_orc: "Half-Orc",
  half_elf: "Half-Elf",
}

function displayRace(slug: string | null | undefined): string | null {
  if (!slug) return null
  return RACE_DISPLAY[slug] ?? slug.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

export default function CharacterStatblock({ characterName, charsheet: cs }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [packOpen, setPackOpen] = useState(false)
  const canExpand = cs !== null && cs.finalized

  // Parchment colours
  const parchment = "#f5e8c8"
  const parchmentMid = "#e8d5a8"
  const parchmentLine = "#c8a86e"
  const crimsonTop = "linear-gradient(#8b1a1a, #6b1010)"
  const crimsonText = "#8b1a1a"
  const inkDark = "#1a1a1a"

  return (
    <div style={{ background: parchment, border: `1px solid ${parchmentLine}`, fontFamily: "Georgia, serif" }}>

      {/* Header bar */}
      <div
        style={{
          background: crimsonTop,
          padding: "8px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <span style={{ color: parchment, fontSize: 16, fontWeight: "bold" }}>
          {characterName}
        </span>
        {cs && (
          <span style={{ color: "rgba(245,232,200,0.75)", fontSize: 11, fontStyle: "italic" }}>
            {[displayRace(cs.race), cs.class ? cs.class.charAt(0).toUpperCase() + cs.class.slice(1) : null, cs.level]
              .filter(Boolean).join(" ")}
            {cs.subclass ? ` (${cs.subclass.charAt(0).toUpperCase() + cs.subclass.slice(1)})` : ""}
          </span>
        )}
      </div>

      {/* Summary row */}
      <div style={{ padding: "8px 14px 6px", borderBottom: `1px solid ${parchmentLine}` }}>
        <div style={{ display: "flex", gap: 20, fontSize: 11, color: inkDark, flexWrap: "wrap" }}>
          <span><b>AC</b> {cs?.ac ?? "—"}</span>
          <span><b>HP</b> {cs ? `${cs.hp_current}/${cs.hp_max}` : "—"}</span>
          <span><b>Speed</b> {cs?.speed ?? "—"} ft</span>
          <span><b>Initiative</b> {cs ? (cs.initiative >= 0 ? `+${cs.initiative}` : `${cs.initiative}`) : "—"}</span>
          <span><b>Prof</b> {cs ? `+${cs.proficiency_bonus}` : "—"}</span>
        </div>
      </div>

      {/* Ability scores */}
      <div
        style={{
          background: parchmentMid,
          display: "flex",
          justifyContent: "space-around",
          padding: "8px 14px",
          borderBottom: `1px solid ${parchmentLine}`,
        }}
      >
        {ABILITY_KEYS.map((key) => (
          <div key={key} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 8, fontWeight: "bold", textTransform: "uppercase", color: crimsonText, letterSpacing: "0.05em" }}>
              {ABILITY_LABELS[key]}
            </div>
            <div style={{ fontSize: 15, fontWeight: "bold", color: inkDark }}>
              {cs?.[key] ?? "—"}
            </div>
            <div style={{ fontSize: 10, color: "rgba(90,40,10,0.7)" }}>
              {cs ? mod(cs[key]) : "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Expanded two-column sheet */}
      <div
        style={{
          maxHeight: expanded ? 2000 : 0,
          overflow: "hidden",
          transition: "max-height 0.4s ease",
        }}
      >
        {cs && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
              padding: "10px 14px 8px",
              fontSize: 10,
              color: inkDark,
              borderBottom: `1px solid ${parchmentLine}`,
            }}
          >
            {/* ── LEFT COLUMN ── */}
            <div style={{ paddingRight: 12, borderRight: `1px solid ${parchmentLine}` }}>

              <SectionHeader label="Saving Throws" color={crimsonText} />
              {ABILITY_KEYS.map((key) => {
                const isProf = cs.saving_throw_proficiencies?.includes(key)
                return (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", lineHeight: "1.8" }}>
                    <span>{SAVING_THROW_LABELS[key]} {isProf ? <span style={{ color: crimsonText }}>✦</span> : ""}</span>
                    <span style={{ fontWeight: "bold" }}>{saveMod(cs, key)}</span>
                  </div>
                )
              })}

              <Divider color={parchmentLine} />

              <SectionHeader label="Skills" color={crimsonText} />
              {SKILLS.map((skill) => {
                const isExpert = cs.expertise_skills?.includes(skill.name)
                const isProf = cs.skill_proficiencies?.includes(skill.name) || isExpert
                return (
                  <div key={skill.name} style={{ display: "flex", justifyContent: "space-between", lineHeight: "1.7" }}>
                    <span>
                      {skill.label}{" "}
                      {isExpert ? <span style={{ color: crimsonText }}>✦✦</span> : isProf ? <span style={{ color: crimsonText }}>✦</span> : ""}
                    </span>
                    <span style={{ fontWeight: "bold" }}>{skillMod(cs, skill)}</span>
                  </div>
                )
              })}

              <Divider color={parchmentLine} />

              <SectionHeader label="Hit Dice" color={crimsonText} />
              <p>{cs.hit_dice_total - cs.hit_dice_used}/{cs.hit_dice_total}{cs.hit_die ?? ""}</p>

              <Divider color={parchmentLine} />

              <SectionHeader label="Conditions" color={crimsonText} />
              <p>{(cs.conditions && cs.conditions.length > 0) ? cs.conditions.join(", ") : "None"}</p>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div style={{ paddingLeft: 12 }}>

              <SectionHeader label="Features & Traits" color={crimsonText} />
              {cs.features?.length > 0
                ? cs.features.map((f, i) => (
                    <p key={i} style={{ marginBottom: 2 }}>
                      <b>{f.name}</b>
                    </p>
                  ))
                : <p style={{ color: "rgba(90,60,30,0.5)" }}>None yet</p>
              }

              <Divider color={parchmentLine} />

              <SectionHeader label="Equipment" color={crimsonText} />
              {Object.entries(cs.equipped ?? {}).map(([slot, item]) =>
                item ? (
                  <div key={slot} style={{ lineHeight: "1.7" }}>
                    <span style={{ color: "rgba(90,60,30,0.6)", textTransform: "capitalize" }}>
                      {slot.replace(/_/g, " ")}:{" "}
                    </span>
                    <span>{String(item).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                  </div>
                ) : null
              )}
              {cs.inventory?.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <button
                    onClick={() => setPackOpen(o => !o)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      fontFamily: "Georgia, serif",
                      fontSize: 10,
                      color: "rgba(90,60,30,0.7)",
                    }}
                  >
                    {packOpen ? "▾" : "▸"} {cs.inventory.length} item{cs.inventory.length !== 1 ? "s" : ""} in pack
                  </button>
                  {packOpen && (
                    <div style={{ paddingLeft: 10, marginTop: 2 }}>
                      {(cs.inventory as { item_id: string; quantity: number }[]).map((item, i) => (
                        <div key={i} style={{ lineHeight: "1.7" }}>
                          {item.item_id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                          {item.quantity > 1 && <span style={{ color: "rgba(90,60,30,0.5)" }}> ×{item.quantity}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {Object.keys(cs.spell_slots ?? {}).length > 0 && (
                <>
                  <Divider color={parchmentLine} />
                  <SectionHeader label="Spell Slots" color={crimsonText} />
                  {Object.entries(cs.spell_slots).map(([lvl, slot]) => (
                    <div key={lvl} style={{ lineHeight: "1.7" }}>
                      Level {lvl}: {slot.total - slot.used}/{slot.total}
                    </div>
                  ))}
                </>
              )}

              {((cs.cantrips?.length ?? 0) > 0 || (cs.spellbook?.length ?? 0) > 0 || (cs.prepared_spells?.length ?? 0) > 0) && (
                <>
                  <Divider color={parchmentLine} />
                  <SectionHeader label="Spells" color={crimsonText} />
                  {(cs.cantrips?.length ?? 0) > 0 && (
                    <>
                      <p style={{ color: "rgba(90,60,30,0.6)", marginBottom: 1 }}>Cantrips</p>
                      {cs.cantrips!.map(id => (
                        <div key={id} style={{ lineHeight: "1.7", paddingLeft: 6 }}>
                          {id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </div>
                      ))}
                    </>
                  )}
                  {cs.class === "wizard" && (cs.spellbook?.length ?? 0) > 0 && (
                    <>
                      <p style={{ color: "rgba(90,60,30,0.6)", marginBottom: 1, marginTop: 4 }}>Spellbook</p>
                      {cs.spellbook!.map(id => (
                        <div key={id} style={{ lineHeight: "1.7", paddingLeft: 6 }}>
                          {id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </div>
                      ))}
                    </>
                  )}
                  {cs.class === "cleric" && (cs.prepared_spells?.length ?? 0) > 0 && (
                    <>
                      <p style={{ color: "rgba(90,60,30,0.6)", marginBottom: 1, marginTop: 4 }}>Prepared</p>
                      {cs.prepared_spells!.map(id => (
                        <div key={id} style={{ lineHeight: "1.7", paddingLeft: 6 }}>
                          {id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                          {cs.domain_spells?.includes(id) && (
                            <span style={{ color: crimsonText, marginLeft: 4 }}>✦</span>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}

              <Divider color={parchmentLine} />

              <SectionHeader label="Faction Standing" color={crimsonText} />
              {Object.entries(cs.reputation ?? {}).map(([faction, tier]) => (
                <div key={faction} style={{ lineHeight: "1.7" }}>
                  <span>{FACTION_LABELS[faction] ?? faction}:{" "}</span>
                  <span style={{ fontWeight: "bold" }}>{FACTION_TIER_NAMES[tier as number] ?? tier}</span>
                </div>
              ))}

            </div>
          </div>
        )}
      </div>

      {/* Footer expand/collapse tap target */}
      {canExpand && (
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            display: "block",
            width: "100%",
            background: parchmentMid,
            border: "none",
            borderTop: `1px solid ${parchmentLine}`,
            padding: "6px 14px",
            cursor: "pointer",
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: crimsonText,
            fontFamily: "Georgia, serif",
          }}
        >
          {expanded ? "▲ collapse ▲" : "▼ expand full sheet ▼"}
        </button>
      )}
    </div>
  )
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <p style={{ fontSize: 8, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", color, marginBottom: 3, marginTop: 4 }}>
      {label}
    </p>
  )
}

function Divider({ color }: { color: string }) {
  return <div style={{ height: 1, background: color, margin: "6px 0" }} />
}
