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
  const id = useId().replace(/:/g, '')
  const ink = '#141827'
  const white = '#ffffff'
  const yellow = '#ffda36'
  const body = `url(#${id}-body)`
  const face = `url(#${id}-face)`
  const gold = `url(#${id}-gold)`
  return <svg className={`profelink-owl owl-theme-${selected} ${className}`} data-theme={selected} viewBox="0 0 320 320" role="img" aria-label={label} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#39445d" /><stop offset=".5" stopColor={ink} /><stop offset="1" stopColor="#080e1d" /></linearGradient>
      <linearGradient id={`${id}-face`} x1="0" y1="0" x2=".8" y2="1"><stop stopColor={white} /><stop offset=".6" stopColor="#f1f5ff" /><stop offset="1" stopColor="#b9c9e1" /></linearGradient>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff09a" /><stop offset=".5" stopColor={yellow} /><stop offset="1" stopColor="#d99827" /></linearGradient>
    </defs>
    <g className="owl-character">
    {selected === 7 && <path className="owl-cape" d="M100 165Q45 205 30 287Q97 262 158 294Q215 269 277 285Q255 211 213 165Z" fill="#315aa6" stroke="#a1c4ff" strokeWidth="4" />}
    {selected === 2 && <g className="owl-katana"><path d="M71 263L249 48L250 78L88 271Z" fill="#cbd5e1" stroke="#7588a4" strokeWidth="3" /><path d="M243 57L267 28" stroke="#6e334a" strokeWidth="12" strokeLinecap="round" /><path d="M234 49L258 69" stroke={gold} strokeWidth="6" strokeLinecap="round" /></g>}
    <path d="M91 162Q54 184 48 221Q41 257 75 271L108 279Q158 305 208 279Q237 264 248 229L224 159Z" fill={body} stroke={white} strokeWidth="6" strokeLinejoin="round" />
    <path d="M77 106Q63 83 68 57L107 73Q159 47 211 73L247 57Q254 83 239 108L248 151Q252 189 214 210Q188 225 158 231Q113 223 90 205Q65 186 69 153Z" fill={body} stroke={white} strokeWidth="6" strokeLinejoin="round" />
    <path d="M82 117Q91 88 120 94Q144 97 153 119Q171 93 197 94Q225 94 232 119L231 159Q230 195 158 221Q84 203 81 165Z" fill={face} />
    {selected === 7 && <path d="M78 123Q112 107 151 122L158 134L168 122Q204 107 239 123L231 158L174 161L158 147L142 161L84 158Z" fill="#305997" />}
    <g className="owl-eyes" fill={ink}>
      <ellipse cx="117" cy="139" rx="19" ry="23" />
      <ellipse cx="197" cy="139" rx="19" ry="23" />
      <circle cx="124" cy="130" r="6" fill={white} />
      <circle cx="204" cy="130" r="6" fill={white} />
    </g>
    <g fill="none" stroke={ink} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M70 120Q104 109 149 124L148 148Q143 174 115 174Q82 174 78 149L77 123M166 124Q207 109 241 120L237 148Q232 174 202 174Q170 174 167 149Z" />
      <path d="M149 128Q158 122 166 128" />
    </g>
    <path d="M151 138Q159 131 165 139L169 156Q165 169 158 176Q147 166 146 156Z" fill={gold} />
    <path d="M158 143L157 157" fill="none" stroke={white} strokeWidth="4" strokeLinecap="round" />
    <path d="M124 222L155 248L187 222Q162 226 124 222Z" fill={white} />
    <path d="M151 229Q158 222 165 229L167 235L162 241L169 264L148 264L154 241L149 235Z" fill={ink} />
    {selected === 1 && <><path d="M100 211L62 201L65 241L102 254L108 267L114 220Z" fill={face} stroke={ink} strokeWidth="5" strokeLinejoin="round" /><path d="M62 202L101 214L108 260" fill="none" stroke={white} strokeWidth="4" /></>}
    <path d="M206 234Q216 213 234 202Q247 191 251 202Q248 218 243 224Q258 252 230 264Q215 265 211 253" fill={body} stroke={white} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    {selected === 1 && <g className="owl-idea">
      <path d="M256 130Q250 112 262 103Q279 89 292 104Q306 118 295 132L280 146L260 140Z" fill={gold} />
      <path d="M264 118Q268 129 278 123" fill="none" stroke={white} strokeWidth="4" strokeLinecap="round" />
      <path d="M259 147L277 153M258 155L272 160" stroke={white} strokeWidth="4" strokeLinecap="round" />
      <path d="M275 88V80M253 95L248 88M295 94L302 87M306 113L314 111" stroke={yellow} strokeWidth="4" strokeLinecap="round" />
    </g>}
    <path d="M107 284Q120 270 132 284M116 279V286M180 284Q192 270 205 284M192 279V286" fill="none" stroke={yellow} strokeWidth="7" strokeLinecap="round" />
    {selected === 2 && <g className="owl-ninja-band"><path d="M80 89Q156 72 238 89L237 105Q160 91 80 106Z" fill="#9f4560" /><path d="M234 91L273 74L259 98L280 113L236 105Z" fill="#78354b" /><path d="M157 85L163 97L150 97Z" fill={gold} /></g>}
    {selected === 3 && <g className="owl-doctor"><path d="M102 213L85 266Q158 298 229 265L212 213L182 222L159 254L136 222Z" fill={face} stroke="#adc1da" strokeWidth="3" /><path d="M133 222V241Q134 261 153 261Q173 261 174 241V225" fill="none" stroke="#335976" strokeWidth="5" /><circle cx="176" cy="251" r="7" fill="#3b6688" stroke="#a6d3e8" strokeWidth="3" /><g className="owl-prop-sway"><rect x="220" y="245" width="49" height="31" rx="5" fill="#35566c" stroke="#adc1da" strokeWidth="3" /><path d="M234 245V237H253V245" fill="none" stroke="#adc1da" strokeWidth="4" /><path d="M243 253V268M235 261H252" stroke="#f1f5ff" strokeWidth="4" /></g></g>}
    {selected === 4 && <g className="owl-graduate"><path d="M88 61L158 34L226 61L158 87Z" fill="#315aa6" stroke={white} strokeWidth="4" /><path d="M117 75V90Q159 107 200 90V75" fill="#243a6b" stroke={white} strokeWidth="4" /><g className="owl-tassel"><path d="M224 64V95" stroke={yellow} strokeWidth="4" /><circle cx="224" cy="99" r="5" fill={gold} /></g><g className="owl-prop-sway"><path d="M206 235L256 215L268 242L218 262Z" fill="#f4e5c7" stroke="#c0a57b" strokeWidth="3" /><path d="M232 226L244 251" stroke="#a33d55" strokeWidth="7" /><circle cx="239" cy="241" r="6" fill="#b64b64" /></g></g>}
    {selected === 5 && <g className="owl-gamer"><path d="M65 137V116Q69 62 158 62Q247 62 250 119V139" fill="none" stroke="#6588c8" strokeWidth="10" /><rect x="54" y="123" width="20" height="39" rx="8" fill="#3f5b9c" stroke="#bacdf0" strokeWidth="3" /><rect x="242" y="123" width="20" height="39" rx="8" fill="#3f5b9c" stroke="#bacdf0" strokeWidth="3" /><g className="owl-gamepad"><path d="M122 239Q133 229 159 233Q185 229 196 240L207 267Q206 281 193 275L178 264H140L125 275Q110 281 111 267Z" fill="#36415b" stroke="#bacdf0" strokeWidth="4" /><path d="M132 242V260M123 251H141" stroke="#f1f5ff" strokeWidth="5" /><circle cx="183" cy="245" r="4" fill="#81c4b1" /><circle cx="192" cy="254" r="4" fill="#be82c7" /></g></g>}
    {selected === 6 && <g className="owl-chef"><path d="M109 74L106 56Q87 47 98 30Q108 16 127 26Q144 3 162 24Q185 7 197 29Q219 26 222 43Q223 57 207 60L204 75Z" fill={face} stroke="#b3c7df" strokeWidth="4" /><path d="M109 70H205V88H109Z" fill="#dce5f3" stroke={white} strokeWidth="3" /><path d="M134 219L158 244L185 219L208 274H108Z" fill={face} stroke="#b3c7df" strokeWidth="3" /><circle cx="159" cy="253" r="3" fill={ink} /><circle cx="159" cy="267" r="3" fill={ink} /><g className="owl-prop-sway"><path d="M237 262L257 214" stroke="#95a9c1" strokeWidth="7" strokeLinecap="round" /><ellipse cx="262" cy="201" rx="17" ry="21" fill="#d6e2f0" stroke="#8297b4" strokeWidth="4" /></g></g>}
    {selected === 7 && <g className="owl-hero"><path d="M136 232L158 226L181 232L157 263Z" fill={gold} /><path d="M158 235L148 246H163L155 256" fill="none" stroke="#315aa6" strokeWidth="3" /></g>}
    {selected === 8 && <g className="owl-detective"><path d="M104 219L82 267L135 281L158 250L184 281L233 266L211 218L179 228L159 249L137 228Z" fill="#a38a68" stroke="#d5c2a2" strokeWidth="3" /><path d="M112 223L131 249L115 260M203 223L185 249L199 260" fill="none" stroke="#6c583e" strokeWidth="4" /><path d="M81 81L106 68L116 34L160 44L202 34L215 68L239 81Z" fill="#a38a68" stroke="#d5c2a2" strokeWidth="3" /><path d="M109 66Q158 78 212 66" fill="none" stroke="#4e4437" strokeWidth="9" /><g className="owl-prop-sway"><circle cx="245" cy="223" r="23" fill="#93c5fd33" stroke="#c5d5ea" strokeWidth="6" /><path d="M231 242L214 264" stroke="#8e6c47" strokeWidth="9" strokeLinecap="round" /><path d="M240 208Q254 205 259 219" fill="none" stroke="#e8f3ff" strokeWidth="3" /></g></g>}
    {selected === 9 && <g className="owl-wizard"><path d="M103 78L146 12Q180 37 202 78Z" fill="#604882" stroke="#b1a1cf" strokeWidth="4" /><ellipse cx="155" cy="80" rx="63" ry="12" fill="#493361" stroke="#b1a1cf" strokeWidth="3" /><path d="M144 39L148 49L158 49L150 56L153 66L144 60L135 66L138 55L130 49H140Z" fill={gold} /><g className="owl-wand"><path d="M228 264L269 191" stroke="#ad8fcf" strokeWidth="7" strokeLinecap="round" /><path d="M263 201L269 191" stroke="#f1e1ff" strokeWidth="8" /><path className="owl-sparkle" d="M272 164L277 177L291 181L277 186L272 199L267 186L254 181L267 177Z" fill={gold} /></g></g>}
    {selected === 10 && <g className="owl-musician"><path d="M131 224L159 245L184 224L197 273H119Z" fill="#304b64" /><g className="owl-guitar"><path d="M181 236L233 193L243 204L194 249Z" fill="#bc915d" stroke="#e4c194" strokeWidth="3" /><path d="M147 232Q167 218 182 232Q201 228 208 246Q218 272 195 283Q167 297 148 276Q132 256 147 232Z" fill="#ac744d" stroke="#e5b98d" strokeWidth="4" /><circle cx="178" cy="253" r="12" fill="#3c2d2a" stroke="#e5b98d" strokeWidth="3" /><path d="M166 272L235 199M171 275L240 202" stroke="#f2d9af" strokeWidth="1.5" /><path d="M160 269L178 279" stroke="#4f3430" strokeWidth="5" /></g><path className="owl-music-note" d="M257 205V179L277 174V199M257 184L277 179" fill="none" stroke="#a9c2ee" strokeWidth="4" /><ellipse className="owl-music-note" cx="251" cy="207" rx="7" ry="5" fill="#a9c2ee" /></g>}
    </g>
  </svg>
}
import { useId } from 'react'
import './avatars.css'
