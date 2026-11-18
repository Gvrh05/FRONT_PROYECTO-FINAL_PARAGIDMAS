export type ActivityType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'GOAL_KICK'

export function ActivityTypeSelect({ value, onChange, disabled, allowGoalKick = true }: { value: ActivityType; onChange: (value: ActivityType) => void; disabled?: boolean; allowGoalKick?: boolean }) {
  return <div className="field"><label htmlFor="question-kind">Tipo de actividad</label>
    <select id="question-kind" value={value} disabled={disabled} onChange={event => {
      const next = event.target.value
      if (next === 'MULTIPLE_CHOICE' || next === 'TRUE_FALSE' || next === 'GOAL_KICK') onChange(next)
    }}>
      <option value="MULTIPLE_CHOICE">Opción múltiple (2–5 opciones)</option>
      <option value="TRUE_FALSE">Verdadero / Falso</option>
      {allowGoalKick && <option value="GOAL_KICK">Tiro al Arco · fútbol, 40 segundos</option>}
    </select>
  </div>
}
