export interface OwlAvatarProps {
  variant?: number
  label?: string
  className?: string
}

/** Local vector interpretation of public/getanyui/profelinkicon.png.
 * The wire protocol keeps avatarId 0–9; the illustration API uses variant 1–10.
 */
export function OwlAvatar({ variant = 1, label = 'Búho ProfeLink', className = '' }: OwlAvatarProps) {
  const selected = Number.isInteger(variant) && variant >= 1 && variant <= 10 ? variant : 1
  const ink = '#141827'
  const white = '#ffffff'
  const yellow = '#ffda36'
  return <svg className={`profelink-owl ${className}`} viewBox="0 0 320 320" role="img" aria-label={label} xmlns="http://www.w3.org/2000/svg">
    {selected === 4 && <path d="M100 165Q45 205 38 284Q97 269 158 294Q215 270 263 283Q255 211 213 165Z" fill="#2563eb" stroke={white} strokeWidth="5" />}
    <path d="M91 162Q54 184 48 221Q41 257 75 271L108 279Q158 305 208 279Q237 264 248 229L224 159Z" fill={ink} stroke={white} strokeWidth="6" strokeLinejoin="round" />
    <path d="M77 106Q63 83 68 57L107 73Q159 47 211 73L247 57Q254 83 239 108L248 151Q252 189 214 210Q188 225 158 231Q113 223 90 205Q65 186 69 153Z" fill={ink} stroke={white} strokeWidth="6" strokeLinejoin="round" />
    <path d="M82 117Q91 88 120 94Q144 97 153 119Q171 93 197 94Q225 94 232 119L231 159Q230 195 158 221Q84 203 81 165Z" fill={white} />
    <g className="owl-eyes" fill={ink}>
      <ellipse cx="117" cy="139" rx="19" ry="23" />
      {selected === 5 ? <path d="M179 141Q196 124 211 141" fill="none" stroke={ink} strokeWidth="8" strokeLinecap="round" /> : <ellipse cx="197" cy="139" rx="19" ry="23" />}
      <circle cx="124" cy="130" r="6" fill={white} />
      {selected !== 5 && <circle cx="204" cy="130" r="6" fill={white} />}
    </g>
    <g fill="none" stroke={ink} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M70 120Q104 109 149 124L148 148Q143 174 115 174Q82 174 78 149L77 123M166 124Q207 109 241 120L237 148Q232 174 202 174Q170 174 167 149Z" />
      <path d="M149 128Q158 122 166 128" />
    </g>
    <path d="M151 138Q159 131 165 139L169 156Q165 169 158 176Q147 166 146 156Z" fill={yellow} />
    <path d="M158 143L157 157" fill="none" stroke={white} strokeWidth="4" strokeLinecap="round" />
    <path d="M124 222L155 248L187 222Q162 226 124 222Z" fill={white} />
    <path d="M151 229Q158 222 165 229L167 235L162 241L169 264L148 264L154 241L149 235Z" fill={selected === 10 ? '#ef4444' : ink} />
    <path d="M100 211L62 201L65 241L102 254L108 267L114 220Z" fill={selected === 6 ? '#60a5fa' : white} stroke={ink} strokeWidth="5" strokeLinejoin="round" />
    <path d="M62 202L101 214L108 260" fill="none" stroke={white} strokeWidth="4" />
    <path d="M206 234Q216 213 234 202Q247 191 251 202Q248 218 243 224Q258 252 230 264Q215 265 211 253" fill={ink} stroke={white} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <g className="owl-idea">
      <path d="M256 130Q250 112 262 103Q279 89 292 104Q306 118 295 132L280 146L260 140Z" fill={yellow} />
      <path d="M264 118Q268 129 278 123" fill="none" stroke={white} strokeWidth="4" strokeLinecap="round" />
      <path d="M259 147L277 153M258 155L272 160" stroke={white} strokeWidth="4" strokeLinecap="round" />
      <path d="M275 88V80M253 95L248 88M295 94L302 87M306 113L314 111" stroke={yellow} strokeWidth="4" strokeLinecap="round" />
    </g>
    <path d="M107 284Q120 270 132 284M116 279V286M180 284Q192 270 205 284M192 279V286" fill="none" stroke={yellow} strokeWidth="7" strokeLinecap="round" />
    {selected === 1 && <g strokeLinejoin="round"><path d="M88 61L158 34L226 61L158 87Z" fill="#2563eb" stroke={white} strokeWidth="4" /><path d="M117 75V90Q159 107 200 90V75" fill="#1e3a8a" stroke={white} strokeWidth="4" /><path d="M224 64V95" stroke={yellow} strokeWidth="4" /><circle cx="224" cy="99" r="5" fill={yellow} /></g>}
    {selected === 2 && <g fill="none" stroke="#60a5fa" strokeWidth="9"><path d="M67 137V116Q69 62 158 62Q247 62 248 119V139" /><rect x="56" y="123" width="17" height="37" rx="8" fill="#2563eb" stroke={white} strokeWidth="3" /><rect x="243" y="123" width="17" height="37" rx="8" fill="#2563eb" stroke={white} strokeWidth="3" /></g>}
    {selected === 3 && <path d="M118 83L109 48L138 64L158 36L178 64L206 48L197 83Z" fill={yellow} stroke={white} strokeWidth="4" strokeLinejoin="round" />}
    {selected === 4 && <path d="M186 240L190 226L194 240L207 244L194 248L190 263L186 248L173 244Z" fill={yellow} />}
    {selected === 5 && <path d="M110 86L114 75L118 86L130 90L118 94L114 105L110 94L98 90Z" fill={yellow} />}
    {selected === 6 && <path d="M88 218L91 237L96 232L101 241L98 221" fill={yellow} />}
    {selected === 7 && <g transform="rotate(24 229 238)"><path d="M229 211V264" stroke="#d6a16c" strokeWidth="7" strokeLinecap="round" /><path d="M220 209Q218 196 229 187Q240 197 237 209Z" fill="#a78bfa" stroke={white} strokeWidth="3" /></g>}
    {selected === 8 && <g fill="#38bdf8" stroke={white} strokeWidth="3"><path d="M112 219Q157 233 204 217L205 231Q155 248 110 232Z" /><path d="M182 238L200 236L216 270L196 265Z" /></g>}
    {selected === 9 && <g fill="#a78bfa" stroke={white} strokeWidth="2"><path d="M155 235L135 224L135 247ZM163 235L183 224L183 247Z" /><circle cx="159" cy="235" r="6" /></g>}
  </svg>
}
