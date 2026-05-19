// note-images.js — SVG icons for fragrance notes (no external images, no copyright issues)

const NOTE_SVGS = {
  // Citrus
  lemon: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><ellipse cx="20" cy="20" rx="14" ry="10" fill="#f5e642" stroke="#d4b800" stroke-width="1.5"/><ellipse cx="20" cy="20" rx="14" ry="10" fill="none" stroke="#b89a00" stroke-width="0.5" transform="rotate(30 20 20)"/><circle cx="20" cy="20" r="3" fill="#f5e642" stroke="#d4b800" stroke-width="1"/></svg>`,
  orange: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="21" r="13" fill="#f5a623" stroke="#c47d00" stroke-width="1.5"/><line x1="20" y1="8" x2="20" y2="4" stroke="#4a7c3f" stroke-width="2" stroke-linecap="round"/><line x1="20" y1="4" x2="24" y2="2" stroke="#4a7c3f" stroke-width="1.5" stroke-linecap="round"/><path d="M14 21 Q20 14 26 21 Q20 28 14 21Z" fill="rgba(255,255,255,0.15)"/></svg>`,
  bergamot: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="21" r="12" fill="#c8e06b" stroke="#8aad00" stroke-width="1.5"/><line x1="20" y1="9" x2="20" y2="5" stroke="#4a7c3f" stroke-width="2" stroke-linecap="round"/><path d="M14 21 Q20 15 26 21 Q20 27 14 21Z" fill="rgba(255,255,255,0.2)"/></svg>`,
  grapefruit: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="13" fill="#f5c0a0" stroke="#e0804a" stroke-width="1.5"/><circle cx="20" cy="20" r="8" fill="none" stroke="#e0804a" stroke-width="0.8" stroke-dasharray="2 2"/><circle cx="20" cy="20" r="3" fill="#f0a070"/></svg>`,
  mandarin: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="21" r="12" fill="#f09a2a" stroke="#c06a00" stroke-width="1.5"/><line x1="20" y1="9" x2="20" y2="5" stroke="#4a7c3f" stroke-width="2" stroke-linecap="round"/><path d="M12 21 Q16 17 20 21 Q24 17 28 21" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.2"/></svg>`,

  // Florals
  rose: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="6" fill="#e8556a"/><ellipse cx="20" cy="12" rx="5" ry="7" fill="#e8556a" opacity="0.85"/><ellipse cx="28" cy="16" rx="5" ry="7" fill="#e8556a" opacity="0.8" transform="rotate(60 28 16)"/><ellipse cx="27" cy="25" rx="5" ry="7" fill="#e8556a" opacity="0.75" transform="rotate(120 27 25)"/><ellipse cx="20" cy="28" rx="5" ry="7" fill="#c43050" opacity="0.8"/><ellipse cx="13" cy="25" rx="5" ry="7" fill="#e8556a" opacity="0.75" transform="rotate(-120 13 25)"/><ellipse cx="12" cy="16" rx="5" ry="7" fill="#e8556a" opacity="0.8" transform="rotate(-60 12 16)"/></svg>`,
  jasmine: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="3" fill="#fff5c0"/><ellipse cx="20" cy="11" rx="3.5" ry="6" fill="#fffde0" opacity="0.9"/><ellipse cx="27" cy="14" rx="3.5" ry="6" fill="#fffde0" opacity="0.9" transform="rotate(45 27 14)"/><ellipse cx="29" cy="22" rx="3.5" ry="6" fill="#fffde0" opacity="0.9" transform="rotate(90 29 22)"/><ellipse cx="25" cy="29" rx="3.5" ry="6" fill="#fffde0" opacity="0.9" transform="rotate(135 25 29)"/><ellipse cx="15" cy="29" rx="3.5" ry="6" fill="#fffde0" opacity="0.9" transform="rotate(-135 15 29)"/><ellipse cx="11" cy="22" rx="3.5" ry="6" fill="#fffde0" opacity="0.9" transform="rotate(-90 11 22)"/><ellipse cx="13" cy="14" rx="3.5" ry="6" fill="#fffde0" opacity="0.9" transform="rotate(-45 13 14)"/></svg>`,
  iris: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="19" y="20" width="2" height="14" fill="#6a8a4a" rx="1"/><path d="M20 20 C14 14 10 8 20 6 C30 8 26 14 20 20Z" fill="#9b7fc9"/><path d="M20 20 C26 14 32 12 30 20 C28 26 22 24 20 20Z" fill="#7b5fa9" opacity="0.9"/><path d="M20 20 C14 26 8 28 10 20 C12 14 18 16 20 20Z" fill="#7b5fa9" opacity="0.9"/></svg>`,
  violet: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="19" y="22" width="2" height="12" fill="#5a7a3a" rx="1"/><path d="M20 22 C16 16 12 10 20 8 C28 10 24 16 20 22Z" fill="#9060c0"/><path d="M20 22 C24 16 30 14 29 22 C28 28 22 26 20 22Z" fill="#7840a0" opacity="0.9"/><path d="M20 22 C16 28 10 28 11 22 C12 16 18 18 20 22Z" fill="#7840a0" opacity="0.9"/><circle cx="20" cy="22" r="2.5" fill="#ffd700"/></svg>`,
  lavender: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="19" y="14" width="2" height="18" fill="#7a9a5a" rx="1"/><ellipse cx="20" cy="11" rx="3" ry="5" fill="#b090d8"/><ellipse cx="16" cy="14" rx="2.5" ry="4" fill="#b090d8" opacity="0.85"/><ellipse cx="24" cy="14" rx="2.5" ry="4" fill="#b090d8" opacity="0.85"/><ellipse cx="14" cy="18" rx="2" ry="3.5" fill="#9070b8" opacity="0.75"/><ellipse cx="26" cy="18" rx="2" ry="3.5" fill="#9070b8" opacity="0.75"/></svg>`,

  // Woody/Earthy
  sandalwood: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M10 30 Q15 10 20 8 Q25 10 30 30Z" fill="#c89060" opacity="0.4"/><path d="M8 32 C12 20 16 14 20 10 C24 14 28 20 32 32" fill="none" stroke="#8b5a2b" stroke-width="2.5" stroke-linecap="round"/><path d="M13 28 C16 20 18 16 20 13 C22 16 24 20 27 28" fill="none" stroke="#a07040" stroke-width="1.8" stroke-linecap="round"/><path d="M17 26 C18.5 22 19 19 20 17 C21 19 21.5 22 23 26" fill="none" stroke="#c09060" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  cedar: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="26" width="4" height="8" fill="#8b5a2b" rx="1"/><polygon points="20,4 8,18 14,18 8,28 20,22 32,28 26,18 32,18" fill="#5a8040"/><polygon points="20,4 12,16 20,12 28,16" fill="#4a7030"/></svg>`,
  vetiver: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M15 34 C16 24 17 18 18 10" fill="none" stroke="#6b8040" stroke-width="2" stroke-linecap="round"/><path d="M20 34 C20 24 20 18 20 8" fill="none" stroke="#7a9050" stroke-width="2" stroke-linecap="round"/><path d="M25 34 C24 24 23 18 22 10" fill="none" stroke="#6b8040" stroke-width="2" stroke-linecap="round"/><path d="M12 32 C14 26 15 22 16 18" fill="none" stroke="#5a7030" stroke-width="1.5" stroke-linecap="round"/><path d="M28 32 C26 26 25 22 24 18" fill="none" stroke="#5a7030" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  oud: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="18" width="10" height="14" rx="2" fill="#5a3010"/><rect x="13" y="14" width="14" height="6" rx="2" fill="#7a4820"/><path d="M17 14 C17 10 19 8 20 7 C21 8 23 10 23 14" fill="#6a3818"/><path d="M16 18 C16 24 17 28 18 30" fill="none" stroke="#3a1808" stroke-width="1.2"/><path d="M24 18 C24 24 23 28 22 30" fill="none" stroke="#3a1808" stroke-width="1.2"/></svg>`,
  patchouli: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="19" y="20" width="2" height="14" fill="#6a8040" rx="1"/><path d="M20 20 C12 18 8 12 12 8 C16 6 20 14 20 20Z" fill="#6a5030" opacity="0.9"/><path d="M20 20 C28 18 32 12 28 8 C24 6 20 14 20 20Z" fill="#7a6040" opacity="0.85"/><path d="M20 20 C14 24 10 30 16 32 C20 32 20 24 20 20Z" fill="#5a4020" opacity="0.8"/><path d="M20 20 C26 24 30 30 24 32 C20 32 20 24 20 20Z" fill="#6a5030" opacity="0.8"/></svg>`,

  // Musks / Ambers
  musk: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="10" fill="none" stroke="#d4b090" stroke-width="2"/><circle cx="20" cy="20" r="6" fill="none" stroke="#c4a070" stroke-width="1.5"/><circle cx="20" cy="20" r="3" fill="#b49060"/><path d="M20 10 L20 8 M30 20 L32 20 M20 30 L20 32 M10 20 L8 20" stroke="#c4a070" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  amber: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><polygon points="20,6 30,14 30,26 20,34 10,26 10,14" fill="#d4a030" opacity="0.85"/><polygon points="20,10 26,16 26,24 20,30 14,24 14,16" fill="#e8b840" opacity="0.7"/><circle cx="20" cy="20" r="4" fill="#f0c84a" opacity="0.9"/></svg>`,
  ambergris: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><ellipse cx="20" cy="22" rx="12" ry="10" fill="#c8a060" opacity="0.8"/><ellipse cx="20" cy="20" rx="10" ry="8" fill="#d8b070" opacity="0.7"/><circle cx="17" cy="18" r="2.5" fill="#b89050" opacity="0.6"/><circle cx="23" cy="22" r="2" fill="#b89050" opacity="0.5"/><circle cx="20" cy="15" r="1.5" fill="#b89050" opacity="0.5"/></svg>`,

  // Spices
  vanilla: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M20 34 C17 28 14 16 16 8" fill="none" stroke="#8b6030" stroke-width="2.5" stroke-linecap="round"/><path d="M20 34 C23 28 26 16 24 8" fill="none" stroke="#a07040" stroke-width="2" stroke-linecap="round"/><path d="M17 14 C18.5 12 21.5 12 23 14" fill="none" stroke="#c09050" stroke-width="1.5"/><path d="M16 20 C18 18 22 18 24 20" fill="none" stroke="#c09050" stroke-width="1.5"/><path d="M17 26 C18.5 24 21.5 24 23 26" fill="none" stroke="#c09050" stroke-width="1.5"/></svg>`,
  cinnamon: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M12 10 C14 18 18 26 24 32" fill="none" stroke="#8b2500" stroke-width="3" stroke-linecap="round"/><path d="M16 8 C18 16 22 24 28 30" fill="none" stroke="#a03010" stroke-width="2.5" stroke-linecap="round"/><path d="M20 7 C22 15 24 23 28 31" fill="none" stroke="#c04020" stroke-width="2" stroke-linecap="round"/></svg>`,
  cardamom: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><ellipse cx="20" cy="22" rx="7" ry="10" fill="#7a9a50" stroke="#4a7020" stroke-width="1.5"/><path d="M16 16 C18 18 22 18 24 16" fill="none" stroke="#3a6010" stroke-width="1.2"/><path d="M15 21 C17 23 23 23 25 21" fill="none" stroke="#3a6010" stroke-width="1.2"/><path d="M16 26 C18 28 22 28 24 26" fill="none" stroke="#3a6010" stroke-width="1.2"/></svg>`,
  saffron: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="19" y="18" width="2" height="16" fill="#8a7040" rx="1"/><path d="M14 18 C16 14 18 10 20 6" fill="none" stroke="#e09020" stroke-width="2" stroke-linecap="round"/><path d="M20 18 C20 14 20 10 20 6" fill="none" stroke="#f0a030" stroke-width="2" stroke-linecap="round"/><path d="M26 18 C24 14 22 10 20 6" fill="none" stroke="#e09020" stroke-width="2" stroke-linecap="round"/><circle cx="14" cy="18" r="2" fill="#e84040"/><circle cx="20" cy="18" r="2" fill="#e84040"/><circle cx="26" cy="18" r="2" fill="#e84040"/></svg>`,
  'pink pepper': `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="22" r="9" fill="#e87070" stroke="#c04040" stroke-width="1.5"/><circle cx="17" cy="18" r="3" fill="#f09090" opacity="0.7"/><circle cx="23" cy="20" r="2.5" fill="#f09090" opacity="0.6"/><circle cx="20" cy="26" r="2" fill="#d06060" opacity="0.6"/><line x1="20" y1="13" x2="20" y2="9" stroke="#8a6040" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  'black pepper': `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="22" r="9" fill="#3a3a3a" stroke="#1a1a1a" stroke-width="1.5"/><circle cx="17" cy="18" r="3" fill="#555" opacity="0.7"/><circle cx="23" cy="20" r="2.5" fill="#555" opacity="0.6"/><circle cx="20" cy="26" r="2" fill="#2a2a2a" opacity="0.6"/><line x1="20" y1="13" x2="20" y2="9" stroke="#6a5030" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  ginger: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M14 28 C14 22 12 18 14 14 C16 10 20 12 22 16 C24 12 28 10 30 14 C32 18 28 24 26 28Z" fill="#c8a050" stroke="#a07020" stroke-width="1.2"/><path d="M22 16 C23 20 22 24 20 28" fill="none" stroke="#a07020" stroke-width="1.2" stroke-linecap="round"/></svg>`,

  // Gourmand
  coffee: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M12 16 L14 30 Q20 33 26 30 L28 16Z" fill="#4a2810"/><path d="M12 16 C12 12 28 12 28 16" fill="#5a3820" stroke="#3a1808" stroke-width="1"/><path d="M17 20 C18 18 22 18 23 20" fill="none" stroke="#8b5030" stroke-width="1.5" stroke-linecap="round"/><path d="M28 18 C32 17 33 21 30 22" fill="none" stroke="#3a1808" stroke-width="1.5" stroke-linecap="round"/><path d="M18 10 C18 7 20 7 20 10" fill="none" stroke="#a07050" stroke-width="1.2"/><path d="M21 9 C21 6 23 6 23 9" fill="none" stroke="#a07050" stroke-width="1.2"/></svg>`,
  cacao: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><ellipse cx="20" cy="24" rx="10" ry="8" fill="#5a2810"/><ellipse cx="20" cy="22" rx="10" ry="8" fill="#6a3820" stroke="#3a1808" stroke-width="1.2"/><path d="M14 20 C15 18 25 18 26 20" fill="none" stroke="#8b5030" stroke-width="1.2"/><path d="M13 23 C14 21 26 21 27 23" fill="none" stroke="#8b5030" stroke-width="1"/></svg>`,
  chocolate: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="14" width="20" height="18" rx="2" fill="#5a2810"/><rect x="10" y="14" width="20" height="16" rx="2" fill="#6a3820" stroke="#3a1808" stroke-width="1.2"/><line x1="10" y1="20" x2="30" y2="20" stroke="#3a1808" stroke-width="1"/><line x1="10" y1="26" x2="30" y2="26" stroke="#3a1808" stroke-width="1"/><line x1="17" y1="14" x2="17" y2="30" stroke="#3a1808" stroke-width="1"/><line x1="23" y1="14" x2="23" y2="30" stroke="#3a1808" stroke-width="1"/></svg>`,
  caramel: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="11" y="16" width="18" height="16" rx="3" fill="#c07820"/><rect x="11" y="14" width="18" height="6" rx="2" fill="#e09030"/><path d="M14 14 C16 10 18 9 20 10 C22 9 24 10 26 14" fill="none" stroke="#d08020" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  honey: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M15 10 L25 10 L30 20 L25 30 L15 30 L10 20Z" fill="#f0a820" stroke="#c07800" stroke-width="1.5"/><path d="M17 14 L23 14 L26 20 L23 26 L17 26 L14 20Z" fill="#f8c040" opacity="0.7"/></svg>`,
  almond: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M20 8 C24 8 30 14 30 22 C30 28 26 34 20 34 C14 34 10 28 10 22 C10 14 16 8 20 8Z" fill="#c8a060" stroke="#a07030" stroke-width="1.5"/><path d="M20 12 C23 14 26 18 26 22 C26 26 24 30 20 30" fill="none" stroke="#a07030" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  coconut: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="22" r="12" fill="#8b6040" stroke="#5a3818" stroke-width="1.5"/><circle cx="20" cy="22" r="8" fill="#f5e8d0"/><circle cx="16" cy="18" r="1.5" fill="#8b6040"/><circle cx="22" cy="18" r="1.5" fill="#8b6040"/><circle cx="19" cy="23" r="1.5" fill="#8b6040"/></svg>`,
  'tonka bean': `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M20 8 C26 8 32 14 31 22 C30 30 25 35 20 35 C15 35 10 30 9 22 C8 14 14 8 20 8Z" fill="#4a2810" stroke="#2a1008" stroke-width="1.5"/><path d="M20 12 C24 13 27 17 27 22 C27 27 24 31 20 32" fill="none" stroke="#8b5030" stroke-width="1.5" stroke-linecap="round"/><path d="M20 12 C16 13 13 17 13 22" fill="none" stroke="#6a3818" stroke-width="1.2" stroke-linecap="round"/></svg>`,

  // Leather / Tobacco
  leather: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M8 14 C10 10 14 8 20 8 C26 8 30 10 32 14 L34 28 C32 32 26 34 20 34 C14 34 8 32 6 28Z" fill="#7a4828" stroke="#4a2810" stroke-width="1.5"/><path d="M10 16 C12 12 16 11 20 11 C24 11 28 12 30 16" fill="none" stroke="#a07050" stroke-width="1.2"/><path d="M12 24 L28 24" stroke="#4a2810" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  tobacco: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><ellipse cx="20" cy="24" rx="12" ry="8" fill="#8b5030"/><path d="M12 20 C14 14 18 10 20 9 C22 10 26 14 28 20" fill="#a06040" stroke="#6a3818" stroke-width="1.2"/><path d="M16 24 C17 20 19 18 20 17 C21 18 23 20 24 24" fill="#c08050" opacity="0.7"/></svg>`,

  // Fruits
  apple: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M20 10 C22 6 26 6 26 10" fill="none" stroke="#5a8030" stroke-width="1.8" stroke-linecap="round"/><path d="M23 8 L25 6" stroke="#5a8030" stroke-width="1.5" stroke-linecap="round"/><path d="M10 18 C10 10 30 10 30 18 C30 28 26 34 20 34 C14 34 10 28 10 18Z" fill="#e04040"/><path d="M14 16 C15 12 25 12 26 16" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.2"/></svg>`,
  pear: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M20 8 C21 5 23 5 24 8" fill="none" stroke="#5a8030" stroke-width="1.8" stroke-linecap="round"/><path d="M16 14 C16 10 24 10 24 14 C28 16 30 22 28 28 C26 34 14 34 12 28 C10 22 12 16 16 14Z" fill="#c8d860"/><path d="M16 14 C18 12 22 12 24 14" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.2"/></svg>`,
  peach: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="22" r="12" fill="#f0a870"/><path d="M20 10 C20 6 20 4 20 10" stroke="#5a8030" stroke-width="2" stroke-linecap="round"/><path d="M20 10 L20 34" fill="none" stroke="#e88050" stroke-width="1.2" stroke-linecap="round"/><path d="M13 16 C14 14 26 14 27 16" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.2"/></svg>`,
  cherry: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M16 14 C18 8 22 8 24 14" fill="none" stroke="#4a7020" stroke-width="1.8" stroke-linecap="round"/><path d="M20 10 C20 8 21 7 22 8" fill="none" stroke="#4a7020" stroke-width="1.5"/><circle cx="14" cy="26" r="7" fill="#c02040"/><circle cx="26" cy="26" r="7" fill="#a01830"/><circle cx="12" cy="23" r="2" fill="rgba(255,255,255,0.25)"/></svg>`,
  raspberry: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="22" r="10" fill="#c03060"/><circle cx="16" cy="18" r="3.5" fill="#d04070"/><circle cx="24" cy="18" r="3.5" fill="#d04070"/><circle cx="20" cy="26" r="3.5" fill="#d04070"/><circle cx="13" cy="24" r="3" fill="#c03060"/><circle cx="27" cy="24" r="3" fill="#c03060"/><circle cx="16" cy="18" r="1" fill="rgba(255,255,255,0.4)"/><circle cx="24" cy="18" r="1" fill="rgba(255,255,255,0.4)"/></svg>`,
  pineapple: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M14 9 C15 6 17 6 18 8 M20 7 C20 4 22 4 22 7 M24 9 C25 6 27 6 26 9" stroke="#5a8030" stroke-width="1.8" stroke-linecap="round" fill="none"/><ellipse cx="20" cy="24" rx="9" ry="12" fill="#f0c030" stroke="#c09000" stroke-width="1.2"/><path d="M14 18 L26 18 M13 22 L27 22 M14 26 L26 26 M16 30 L24 30" stroke="#c09000" stroke-width="0.8"/><path d="M14 14 L20 36 M26 14 L20 36 M11 20 L29 20" stroke="#c09000" stroke-width="0.8" opacity="0.5"/></svg>`,

  // Marine / Aquatic
  'sea notes': `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M6 26 C10 22 14 28 18 24 C22 20 26 26 30 22 C34 18 36 22 38 20" fill="none" stroke="#4090d0" stroke-width="2.5" stroke-linecap="round"/><path d="M2 30 C6 26 10 32 14 28 C18 24 22 30 26 26 C30 22 34 26 38 24" fill="none" stroke="#60a0e0" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="16" r="4" fill="#4090d0" opacity="0.3"/></svg>`,
  'marine notes': `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M6 24 C10 20 14 26 18 22 C22 18 26 24 30 20 C34 16 36 20 38 18" fill="none" stroke="#3080c0" stroke-width="2.5" stroke-linecap="round"/><path d="M2 30 C6 26 10 32 14 28 C18 24 22 30 26 26 C30 22 34 26 38 24" fill="none" stroke="#50a0d8" stroke-width="2" stroke-linecap="round"/><path d="M16 16 C17 12 20 10 22 12 C24 10 26 12 24 16" fill="#6ab0e8" opacity="0.5"/></svg>`,
  'aquatic notes': `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M20 8 C20 8 26 16 26 22 C26 28 23 32 20 32 C17 32 14 28 14 22 C14 16 20 8 20 8Z" fill="#50a0d0" stroke="#3070a0" stroke-width="1.2"/><path d="M20 14 C21 16 22 18 22 22 C22 26 21 28 20 30" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  // Smoke / Incense
  incense: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="19" y="24" width="2" height="10" fill="#8b6030" rx="1"/><path d="M20 24 C17 20 17 16 20 12 C23 8 23 6 20 4" fill="none" stroke="#9090a0" stroke-width="2" stroke-linecap="round" opacity="0.7"/><path d="M20 20 C16 17 18 12 20 10" fill="none" stroke="#b0b0c0" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/><path d="M20 22 C24 18 22 14 20 12" fill="none" stroke="#a0a0b0" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/></svg>`,
  smoke: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M14 32 C14 28 16 24 14 20 C12 16 14 12 18 10" fill="none" stroke="#808090" stroke-width="2.5" stroke-linecap="round"/><path d="M20 30 C20 26 22 22 20 18 C18 14 20 10 22 8" fill="none" stroke="#a0a0b0" stroke-width="2" stroke-linecap="round" opacity="0.8"/><path d="M26 28 C26 24 24 20 26 16 C28 12 26 8 24 7" fill="none" stroke="#909090" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/></svg>`,

  // Fresh / Green
  mint: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="19" y="16" width="2" height="18" fill="#4a8a40" rx="1"/><path d="M20 28 C14 28 10 24 12 20 C14 16 20 18 20 22 C20 18 26 16 28 20 C30 24 26 28 20 28Z" fill="#5aaa50"/><path d="M20 22 C14 20 10 16 12 12 C14 8 20 10 20 14 C20 10 26 8 28 12 C30 16 26 20 20 22Z" fill="#6aba60"/></svg>`,
  basil: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="19" y="18" width="2" height="16" fill="#3a7030" rx="1"/><path d="M20 26 C14 24 10 18 14 14 C18 10 20 18 20 26Z" fill="#4a9040"/><path d="M20 22 C26 20 30 14 26 10 C22 6 20 14 20 22Z" fill="#5aa050"/><path d="M20 16 C16 13 14 9 16 7 C18 5 20 11 20 16Z" fill="#4a9040" opacity="0.8"/></svg>`,
  tea: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M10 18 L12 32 Q20 35 28 32 L30 18Z" fill="#c8a870"/><path d="M10 18 C10 14 30 14 30 18" fill="#d8b880" stroke="#a07840" stroke-width="1"/><path d="M30 20 C34 19 35 23 32 24" fill="none" stroke="#a07840" stroke-width="1.5" stroke-linecap="round"/><path d="M16 10 C17 7 18 8 18 10 M20 9 C20 6 22 6 22 9 M24 10 C25 7 26 8 24 10" stroke="#5a9050" stroke-width="1.2" stroke-linecap="round" fill="none"/></svg>`,

  // Alcohol / Resin
  rum: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M15 10 L13 32 Q20 35 27 32 L25 10Z" fill="#c88030" stroke="#8b5010" stroke-width="1.2"/><rect x="14" y="8" width="12" height="4" rx="2" fill="#a06020"/><path d="M16 16 C18 14 22 14 24 16" fill="none" stroke="#e0a040" stroke-width="1" stroke-linecap="round"/></svg>`,
  whiskey: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M14 12 L12 32 Q20 35 28 32 L26 12Z" fill="#d09030" stroke="#8b5010" stroke-width="1.2"/><rect x="13" y="10" width="14" height="4" rx="1" fill="#a07020"/><path d="M16 20 C18 18 22 18 24 20" fill="none" stroke="#f0b040" stroke-width="1" stroke-linecap="round"/><path d="M17 26 C18.5 24 21.5 24 23 26" fill="none" stroke="#e0a030" stroke-width="1" stroke-linecap="round"/></svg>`,
};

// Category fallback SVGs
const CATEGORY_SVGS = {
  citrus: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="13" fill="#f0c040" stroke="#c09000" stroke-width="1.5"/><path d="M12 20 Q16 12 20 20 Q24 12 28 20 Q24 28 20 20 Q16 28 12 20Z" fill="rgba(255,255,255,0.2)"/></svg>`,
  floral: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="4" fill="#f5a0c0"/><ellipse cx="20" cy="11" rx="4" ry="7" fill="#f5a0c0" opacity="0.85"/><ellipse cx="28" cy="15" rx="4" ry="7" fill="#f5a0c0" opacity="0.8" transform="rotate(60 28 15)"/><ellipse cx="27" cy="25" rx="4" ry="7" fill="#f5a0c0" opacity="0.75" transform="rotate(120 27 25)"/><ellipse cx="20" cy="29" rx="4" ry="7" fill="#e080a0" opacity="0.8"/><ellipse cx="13" cy="25" rx="4" ry="7" fill="#f5a0c0" opacity="0.75" transform="rotate(-120 13 25)"/><ellipse cx="12" cy="15" rx="4" ry="7" fill="#f5a0c0" opacity="0.8" transform="rotate(-60 12 15)"/></svg>`,
  woody: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="24" width="8" height="10" fill="#8b5a2b" rx="1"/><polygon points="20,4 6,24 34,24" fill="#5a8040"/><polygon points="20,10 9,24 31,24" fill="#4a7030"/></svg>`,
  spicy: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M20 6 C22 10 28 14 28 20 C28 26 24 32 20 34 C16 32 12 26 12 20 C12 14 18 10 20 6Z" fill="#c04020"/><path d="M20 12 C21 15 24 18 24 22 C24 26 22 29 20 31" fill="none" stroke="rgba(255,200,100,0.6)" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  fruity: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="24" r="8" fill="#e05050"/><circle cx="27" cy="22" r="7" fill="#f0a030"/><path d="M16 16 C17 10 20 8 22 10" fill="none" stroke="#5a8030" stroke-width="2" stroke-linecap="round"/></svg>`,
  gourmand: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M10 20 Q10 10 20 8 Q30 10 30 20 L28 32 Q20 36 12 32Z" fill="#c07828"/><path d="M12 18 Q12 12 20 11 Q28 12 28 18" fill="none" stroke="#e09840" stroke-width="1.5"/><circle cx="20" cy="22" r="3" fill="#f0c040" opacity="0.7"/></svg>`,
  green: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M20 34 C20 34 10 26 10 18 C10 10 14 6 20 6 C26 6 30 10 30 18 C30 26 20 34 20 34Z" fill="#4a9040"/><path d="M20 34 C18 26 12 20 16 14" fill="none" stroke="#6aba60" stroke-width="1.5" stroke-linecap="round"/><path d="M20 34 C22 26 28 20 24 14" fill="none" stroke="#5aa050" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  aquatic: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M5 24 C9 20 13 26 17 22 C21 18 25 24 29 20 C33 16 37 20 39 18" fill="none" stroke="#4090d0" stroke-width="2.5" stroke-linecap="round"/><path d="M5 30 C9 26 13 32 17 28 C21 24 25 30 29 26 C33 22 37 26 39 24" fill="none" stroke="#60a8e0" stroke-width="2" stroke-linecap="round"/></svg>`,
  amber: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><polygon points="20,6 32,14 32,26 20,34 8,26 8,14" fill="#d4a030" opacity="0.85"/><polygon points="20,11 26,17 26,23 20,29 14,23 14,17" fill="#e8c050" opacity="0.7"/></svg>`,
  musky: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="11" fill="none" stroke="#c4a080" stroke-width="2"/><circle cx="20" cy="20" r="7" fill="none" stroke="#b08060" stroke-width="1.5"/><circle cx="20" cy="20" r="3.5" fill="#a06840"/></svg>`,
  smoky: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M12 34 C12 28 15 22 13 16 C11 10 14 6 18 4" fill="none" stroke="#707080" stroke-width="2.5" stroke-linecap="round"/><path d="M20 32 C20 26 23 20 21 14 C19 8 21 5 23 4" fill="none" stroke="#909090" stroke-width="2" stroke-linecap="round" opacity="0.8"/><path d="M28 30 C28 24 25 18 27 12 C29 6 27 4 25 4" fill="none" stroke="#808080" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/></svg>`,
  powdery: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="12" fill="none" stroke="#d0b0c0" stroke-width="1.5" stroke-dasharray="2 2"/><circle cx="20" cy="20" r="8" fill="#e8d0d8" opacity="0.6"/><circle cx="20" cy="20" r="4" fill="#f0dce4" opacity="0.8"/><circle cx="20" cy="20" r="1.5" fill="#d0b0c0"/></svg>`,
  fresh: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M20 8 C20 8 26 16 26 22 C26 28 23 32 20 32 C17 32 14 28 14 22 C14 16 20 8 20 8Z" fill="#60c0d0" stroke="#40a0b0" stroke-width="1.2"/><path d="M6 24 C10 20 14 26 18 22 C22 18 26 24 30 20 C34 16 36 20 34 22" fill="none" stroke="#80d0e0" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/></svg>`,
  generic: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="12" fill="none" stroke="#d4af37" stroke-width="1.5"/><circle cx="20" cy="20" r="7" fill="none" stroke="#d4af37" stroke-width="1" stroke-dasharray="3 2"/><circle cx="20" cy="20" r="2.5" fill="#d4af37"/></svg>`,
};

// Normalize note name for lookup
function normalizeNoteName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Detect category from note name keywords
function detectNoteCategory(normalizedName) {
  if (/rose|jasmine|iris|violet|flower|blossom|lily|peony|magnolia|neroli|ylang|gardenia|orchid/.test(normalizedName)) return 'floral';
  if (/lemon|orange|bergamot|grapefruit|citrus|mandarin|tangerine|lime|yuzu|kumquat/.test(normalizedName)) return 'citrus';
  if (/wood|cedar|sandalwood|oud|vetiver|guaiac|birch|ebony|agarwood/.test(normalizedName)) return 'woody';
  if (/apple|pear|peach|cherry|raspberry|pineapple|fruit|berry|plum|fig|melon|mango|apricot|grape/.test(normalizedName)) return 'fruity';
  if (/vanilla|caramel|honey|chocolate|cacao|coffee|almond|tonka|praline|marzipan|cream|milk|sugar|biscuit|cookie/.test(normalizedName)) return 'gourmand';
  if (/sea|marine|aquatic|water|ocean|salt|ozone/.test(normalizedName)) return 'aquatic';
  if (/smoke|incense|oud|tar|ash|burnt/.test(normalizedName)) return 'smoky';
  if (/musk|ambergris|animalic|civet|castoreum/.test(normalizedName)) return 'musky';
  if (/leather/.test(normalizedName)) return 'leather';
  if (/amber|resin|benzoin|labdanum|balsam/.test(normalizedName)) return 'amber';
  if (/pepper|spice|cinnamon|cardamom|saffron|clove|nutmeg|ginger|cumin/.test(normalizedName)) return 'spicy';
  if (/green|herb|grass|basil|mint|fern|moss|pine|juniper|sage|thyme/.test(normalizedName)) return 'green';
  if (/powder|iris|orris|talc/.test(normalizedName)) return 'powdery';
  if (/fresh|clean|air|breeze/.test(normalizedName)) return 'fresh';
  if (/patchouli/.test(normalizedName)) return 'woody';
  if (/lavender/.test(normalizedName)) return 'floral';
  return 'generic';
}

// Exact note name aliases (maps to SVG keys)
const NOTE_ALIASES = {
  'mandarin orange': 'mandarin',
  'mandarin': 'mandarin',
  'marine': 'marine notes',
  'aquatic': 'aquatic notes',
  'sea': 'sea notes',
  'cacao': 'cacao',
  'dark chocolate': 'chocolate',
  'milk chocolate': 'chocolate',
  'white chocolate': 'chocolate',
  'tonka': 'tonka bean',
  'bourbon': 'rum',
  'scotch': 'whiskey',
  'black tea': 'tea',
  'green tea': 'tea',
  'white tea': 'tea',
  'pink peppercorn': 'pink pepper',
  'black peppercorn': 'black pepper',
  'smoky': 'smoke',
  'smoked': 'smoke',
};

// Get SVG icon data URI for a note name
function getNoteIconSVG(noteName) {
  const normalized = normalizeNoteName(noteName);
  const aliased = NOTE_ALIASES[normalized] || normalized;

  if (NOTE_SVGS[aliased]) {
    return NOTE_SVGS[aliased];
  }

  const category = detectNoteCategory(normalized);
  // leather has its own SVG
  if (category === 'leather' && NOTE_SVGS['leather']) return NOTE_SVGS['leather'];

  return CATEGORY_SVGS[category] || CATEGORY_SVGS['generic'];
}

// Get accent color for note icon tinting based on category.
// Card background is always dark; only the border and icon circle use category colour.
function getNoteAccentColor(noteName) {
  const normalized = normalizeNoteName(noteName);
  const category = detectNoteCategory(normalized);
  const colors = {
    citrus:   { border: 'rgba(240,192,60,0.28)',  borderHover: 'rgba(240,192,60,0.55)',  iconBg: 'rgba(240,192,60,0.1)' },
    floral:   { border: 'rgba(230,130,160,0.28)', borderHover: 'rgba(230,130,160,0.55)', iconBg: 'rgba(230,130,160,0.1)' },
    woody:    { border: 'rgba(160,110,60,0.3)',   borderHover: 'rgba(160,110,60,0.58)',  iconBg: 'rgba(139,90,43,0.12)' },
    fruity:   { border: 'rgba(210,80,80,0.28)',   borderHover: 'rgba(210,80,80,0.55)',   iconBg: 'rgba(210,80,80,0.1)' },
    gourmand: { border: 'rgba(200,140,50,0.3)',   borderHover: 'rgba(200,140,50,0.58)',  iconBg: 'rgba(192,120,40,0.12)' },
    aquatic:  { border: 'rgba(60,140,200,0.28)',  borderHover: 'rgba(60,140,200,0.55)',  iconBg: 'rgba(60,140,200,0.1)' },
    smoky:    { border: 'rgba(140,130,120,0.3)',  borderHover: 'rgba(140,130,120,0.58)', iconBg: 'rgba(110,110,120,0.12)' },
    musky:    { border: 'rgba(200,168,130,0.28)', borderHover: 'rgba(200,168,130,0.55)', iconBg: 'rgba(196,160,120,0.1)' },
    leather:  { border: 'rgba(150,90,50,0.3)',    borderHover: 'rgba(150,90,50,0.58)',   iconBg: 'rgba(122,72,40,0.12)' },
    amber:    { border: 'rgba(212,168,55,0.3)',   borderHover: 'rgba(212,168,55,0.58)',  iconBg: 'rgba(212,160,48,0.12)' },
    spicy:    { border: 'rgba(200,80,40,0.28)',   borderHover: 'rgba(200,80,40,0.55)',   iconBg: 'rgba(192,64,32,0.1)' },
    green:    { border: 'rgba(80,158,70,0.28)',   borderHover: 'rgba(80,158,70,0.55)',   iconBg: 'rgba(74,144,64,0.1)' },
    powdery:  { border: 'rgba(210,180,195,0.25)', borderHover: 'rgba(210,180,195,0.5)',  iconBg: 'rgba(208,176,192,0.1)' },
    fresh:    { border: 'rgba(80,190,210,0.28)',  borderHover: 'rgba(80,190,210,0.55)',  iconBg: 'rgba(96,192,208,0.1)' },
    generic:  { border: 'rgba(212,175,55,0.22)',  borderHover: 'rgba(212,175,55,0.5)',   iconBg: 'rgba(212,175,55,0.08)' },
  };
  return colors[category] || colors['generic'];
}

// Render a single note card as HTML string
function renderNoteCard(noteName) {
  const svg = getNoteIconSVG(noteName);
  const { bg, border } = getNoteAccentColor(noteName);
  const displayName = noteName.trim();
  return `<div class="note-card" style="--note-bg:${bg};--note-border:${border};">
    <div class="note-icon">${svg}</div>
    <span class="note-label">${displayName}</span>
  </div>`;
}

// Render a full notes section (top/middle/base)
function renderNoteSection(label, notes) {
  if (!notes || !notes.length) return '';
  const noteArray = Array.isArray(notes)
    ? notes
    : String(notes).split(/[,;|]/).map(n => n.trim()).filter(Boolean);
  if (!noteArray.length) return '';
  const cards = noteArray.map(renderNoteCard).join('');
  return `<div class="note-section">
    <div class="note-section-label">${label}</div>
    <div class="note-cards-row">${cards}</div>
  </div>`;
}

export { getNoteIconSVG, getNoteAccentColor, renderNoteCard, renderNoteSection };
