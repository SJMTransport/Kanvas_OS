// Builds a printable, multi-page HTML report from report data.
// Used both for the on-screen preview (injected via innerHTML) and for the
// print window (window.open + document.write), mirroring the original generator.

import type { ReportData, ReportVideo } from '@/lib/types/report'
import type { Platform } from '@/lib/types'

const PLATFORMS: { key: Platform; label: string; color: string }[] = [
  { key: 'tiktok', label: 'TikTok', color: '#000000' },
  { key: 'instagram', label: 'Instagram', color: '#C13584' },
  { key: 'youtube', label: 'YouTube', color: '#FF0000' },
  { key: 'facebook', label: 'Facebook', color: '#1877F2' },
]

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}
function toNum(v: unknown): number {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}
function plEnabled(v: ReportVideo, pl: Platform): boolean {
  return !v.enabled || v.enabled[pl] !== false
}
function anyEnabled(videos: ReportVideo[], pl: Platform): boolean {
  return videos.some((v) => plEnabled(v, pl))
}

export const REPORT_STYLES = `
:root{ --acc:#D4860A; --navy:#1a2744; --ink:#1f2430; --muted:#6b7280; --line:#eceef2; }
.kr-wrap{ font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif; color:var(--ink); }
.rpage{ width:1100px; min-height:720px; background:#fff; margin:0 auto 18px; box-shadow:0 4px 20px rgba(0,0,0,.18); overflow:hidden; position:relative; display:flex; flex-direction:column; }
.rp-hdr{ display:flex; align-items:center; justify-content:space-between; padding:16px 30px; border-bottom:1px solid var(--line); }
.rp-brand{ font-weight:900; font-size:15px; letter-spacing:-.5px; color:var(--acc); }
.rp-brand span{ color:var(--navy); }
.rp-hdr-r{ font-size:9px; font-weight:700; letter-spacing:.5px; color:#b7bcc6; text-transform:uppercase; }
.rp-ftr{ margin-top:auto; display:flex; align-items:center; justify-content:space-between; padding:10px 30px; border-top:1px solid var(--line); font-size:9px; font-weight:700; color:#b7bcc6; text-transform:uppercase; letter-spacing:.4px; }
.rp-ftr b{ color:var(--acc); }
.rp-sec-title{ font-size:32px; font-weight:900; color:var(--ink); }
.rp-sec-title span{ color:var(--acc); }
.rp-accent{ width:44px; height:4px; background:var(--acc); border-radius:2px; margin:6px 0 18px; }

/* Cover */
.cover-body{ flex:1; display:flex; }
.cover-left{ flex:1; padding:48px 56px; display:flex; flex-direction:column; justify-content:center; }
.cover-sub{ font-size:11px; font-weight:800; letter-spacing:3px; text-transform:uppercase; color:var(--ink); margin-bottom:18px; }
.cover-sub .o{ color:var(--acc); }
.cover-title{ font-size:52px; font-weight:900; line-height:1.02; text-transform:uppercase; color:var(--ink); margin-bottom:12px; word-break:break-word; }
.cover-line{ width:52px; height:4px; background:var(--acc); border-radius:2px; margin-bottom:18px; }
.cover-kol{ font-size:14px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#555; margin-bottom:28px; }
.cover-info{ display:flex; flex-direction:column; gap:12px; }
.cover-info-row{ display:flex; align-items:center; gap:12px; }
.cover-info-dot{ width:38px; height:38px; border-radius:50%; background:#f6ecd9; display:flex; align-items:center; justify-content:center; color:var(--acc); font-weight:900; }
.cover-info-lbl{ font-size:8px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:#b7bcc6; }
.cover-info-val{ font-size:13px; font-weight:800; color:var(--ink); }
.cover-right{ width:360px; flex-shrink:0; position:relative; background:#fbf3e6; overflow:hidden; }
.cover-pill{ position:absolute; right:-70px; top:50%; transform:translateY(-50%) rotate(-8deg); width:270px; height:520px; background:var(--acc); border-radius:90px; }
.cover-pill2{ position:absolute; right:60px; top:8%; width:160px; height:360px; background:rgba(212,134,10,.18); border-radius:70px; transform:rotate(-8deg); }

/* Total view table */
.pad{ padding:0 56px 24px; flex:1; }
.tv-tbl{ border-collapse:collapse; width:560px; }
.tv-tbl thead th{ background:var(--acc); color:#fff; padding:12px 22px; font-size:12px; font-weight:700; }
.tv-tbl thead th:first-child{ text-align:left; }
.tv-tbl tbody td{ padding:12px 22px; border-bottom:1px solid var(--line); font-size:14px; font-weight:700; }
.tv-tbl tbody td.num{ text-align:center; }
.tv-dot{ display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:9px; vertical-align:middle; }
.tv-tot td{ background:var(--acc); color:#fff; font-weight:900; font-size:15px; border:none; }

/* Engagement table */
.eng-tbl{ border-collapse:collapse; width:100%; font-size:11px; }
.eng-tbl .plat-hdr{ background:var(--navy); color:#fff; padding:9px 6px; font-weight:900; text-align:center; }
.eng-tbl .col-hdr{ background:var(--acc); color:#fff; padding:6px; font-weight:700; font-size:9px; text-transform:uppercase; text-align:center; }
.eng-tbl .title-hdr{ background:var(--navy); color:var(--acc); padding:9px 12px; font-weight:900; font-size:11px; }
.eng-tbl td{ padding:7px 6px; border:1px solid var(--line); text-align:center; font-weight:600; color:#333; }
.eng-tbl td.tcell{ text-align:left; font-weight:800; color:var(--navy); background:#f7f8fc; max-width:150px; }
.eng-tbl tr.total td{ background:var(--acc); color:#fff; font-weight:900; }

/* Video intro */
.vi{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 80px; }
.vi-badge{ background:var(--acc); color:#fff; font-size:11px; font-weight:900; padding:6px 20px; border-radius:20px; letter-spacing:2px; margin-bottom:22px; }
.vi-title{ font-size:40px; font-weight:900; text-align:center; line-height:1.15; color:var(--ink); }

/* Platform card */
.pcard{ flex:1; display:flex; }
.pcard-l{ width:250px; flex-shrink:0; background:#dfe3ee; display:flex; align-items:center; justify-content:center; padding:22px; }
.phone{ width:190px; height:340px; background:#111; border-radius:22px; overflow:hidden; box-shadow:0 8px 26px rgba(0,0,0,.35); }
.phone img{ width:100%; height:100%; object-fit:cover; }
.phone-ph{ width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,.3); font-size:12px; text-align:center; padding:16px; }
.pcard-r{ flex:1; padding:24px 30px; display:flex; flex-direction:column; gap:14px; }
.pcard-title{ font-size:22px; font-weight:900; color:var(--ink); }
.pcard-title span{ color:var(--acc); }
.pcard-vt{ font-size:13px; font-weight:800; text-transform:uppercase; line-height:1.3; }
.pcard-date{ font-size:10px; color:var(--muted); }
.mrow{ display:flex; border:1.5px solid var(--line); border-radius:10px; overflow:hidden; margin-top:6px; }
.mcell{ flex:1; text-align:center; padding:14px 4px; border-right:1px solid var(--line); }
.mcell:last-child{ border-right:none; }
.mval{ font-size:20px; font-weight:900; }
.mlbl{ font-size:8px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; margin-top:4px; }

/* Thank you */
.ty{ flex:1; display:flex; align-items:center; }
.ty-l{ flex:1; padding:56px; }
.ty-big{ font-size:82px; font-weight:900; line-height:.95; color:var(--navy); letter-spacing:-3px; margin-bottom:16px; }
.ty-kol{ font-size:15px; font-weight:700; color:var(--acc); letter-spacing:2px; text-transform:uppercase; }
.ty-r{ width:230px; flex-shrink:0; align-self:stretch; background:var(--acc); }
.ty-contacts{ padding:20px 56px 40px; display:flex; gap:22px; flex-wrap:wrap; }
.ty-contact{ font-size:12px; font-weight:600; color:var(--navy); }
.ty-contact b{ color:var(--acc); }
`

function rpHdr(): string {
  return `<div class="rp-hdr"><div class="rp-brand">KANVAS<span>OS</span></div><div class="rp-hdr-r">Social Media Campaign Report</div></div>`
}
function rpFtr(campaign: string, page: number): string {
  return `<div class="rp-ftr"><div><b>${String(page).padStart(2, '0')}</b> &nbsp; ${esc(campaign || 'Campaign')}</div><div>Kanvas OS</div></div>`
}

function coverPage(d: ReportData): string {
  const c = d.campaign
  return `<div class="rpage">${rpHdr()}
  <div class="cover-body">
    <div class="cover-left">
      <div class="cover-sub"><span class="o">SOCIAL MEDIA</span> CAMPAIGN REPORT</div>
      <div class="cover-title">${esc(c.campaign || 'Nama Campaign')}</div>
      <div class="cover-line"></div>
      <div class="cover-kol">${esc((c.handle || c.kol || '').replace(/@/g, '').toUpperCase())}</div>
      <div class="cover-info">
        <div class="cover-info-row"><div class="cover-info-dot">◷</div><div><div class="cover-info-lbl">Update</div><div class="cover-info-val">${esc(c.date || '-')}</div></div></div>
        <div class="cover-info-row"><div class="cover-info-dot">◍</div><div><div class="cover-info-lbl">KOL</div><div class="cover-info-val">${esc(c.kol || '-')}</div></div></div>
      </div>
    </div>
    <div class="cover-right"><div class="cover-pill2"></div><div class="cover-pill"></div></div>
  </div></div>`
}

function totalViewPage(d: ReportData): string {
  const sums: Record<Platform, number> = { tiktok: 0, instagram: 0, youtube: 0, facebook: 0 }
  d.videos.forEach((v) => PLATFORMS.forEach((p) => { if (plEnabled(v, p.key)) sums[p.key] += toNum(v[p.key].views) }))
  const active = PLATFORMS.filter((p) => anyEnabled(d.videos, p.key))
  const total = active.reduce((s, p) => s + sums[p.key], 0)
  const rows = active.map((p) => `<tr><td><span class="tv-dot" style="background:${p.color}"></span>${p.label}</td><td class="num">${fmt(sums[p.key])}</td></tr>`).join('')
  return `<div class="rpage">${rpHdr()}<div class="pad" style="padding-top:36px">
    <div class="rp-sec-title">TOTAL <span>VIEW</span></div><div class="rp-accent"></div>
    <table class="tv-tbl"><thead><tr><th>Platform</th><th style="text-align:center">Total Views</th></tr></thead>
    <tbody>${rows}<tr class="tv-tot"><td>TOTAL</td><td class="num">${fmt(total)}</td></tr></tbody></table>
  </div>${rpFtr(d.campaign.campaign, 2)}</div>`
}

function engagementPage(d: ReportData): string {
  const show = { tiktok: anyEnabled(d.videos, 'tiktok'), instagram: anyEnabled(d.videos, 'instagram'), youtube: anyEnabled(d.videos, 'youtube'), facebook: anyEnabled(d.videos, 'facebook') }
  const cell = (v: ReportVideo, pl: Platform, val: unknown) => plEnabled(v, pl) ? `<td>${esc(val || '-')}</td>` : `<td style="color:#ccc">—</td>`
  const rows = d.videos.map((v) => `<tr><td class="tcell">${esc(v.title || 'Video')}</td>
    ${show.tiktok ? cell(v, 'tiktok', v.tiktok.views) + cell(v, 'tiktok', v.tiktok.likes) + cell(v, 'tiktok', v.tiktok.comments) : ''}
    ${show.instagram ? cell(v, 'instagram', v.instagram.views) + cell(v, 'instagram', v.instagram.likes) + cell(v, 'instagram', v.instagram.comments) : ''}
    ${show.youtube ? cell(v, 'youtube', v.youtube.views) + cell(v, 'youtube', v.youtube.likes) + cell(v, 'youtube', v.youtube.comments) : ''}
    ${show.facebook ? cell(v, 'facebook', v.facebook.views) + cell(v, 'facebook', v.facebook.reactions) : ''}
  </tr>`).join('')
  const colspan = (Number(show.tiktok) * 3) + (Number(show.instagram) * 3) + (Number(show.youtube) * 3) + (Number(show.facebook) * 2)
  return `<div class="rpage">${rpHdr()}<div class="pad" style="padding-top:36px">
    <div class="rp-sec-title">ENGAGEMENT <span>DETAIL</span></div><div class="rp-accent"></div>
    <div style="overflow-x:auto"><table class="eng-tbl">
      <thead>
        <tr><th class="title-hdr" rowspan="2">Judul Video</th>
          ${show.tiktok ? '<th class="plat-hdr" colspan="3">TikTok</th>' : ''}
          ${show.instagram ? '<th class="plat-hdr" colspan="3">Instagram</th>' : ''}
          ${show.youtube ? '<th class="plat-hdr" colspan="3">YouTube</th>' : ''}
          ${show.facebook ? '<th class="plat-hdr" colspan="2">Facebook</th>' : ''}
        </tr>
        <tr>
          ${show.tiktok ? '<th class="col-hdr">Views</th><th class="col-hdr">Likes</th><th class="col-hdr">Comm</th>' : ''}
          ${show.instagram ? '<th class="col-hdr">Views</th><th class="col-hdr">Likes</th><th class="col-hdr">Comm</th>' : ''}
          ${show.youtube ? '<th class="col-hdr">Views</th><th class="col-hdr">Likes</th><th class="col-hdr">Comm</th>' : ''}
          ${show.facebook ? '<th class="col-hdr">Views</th><th class="col-hdr">React</th>' : ''}
        </tr>
      </thead>
      <tbody>${rows || `<tr><td class="tcell">-</td><td colspan="${colspan}">Belum ada video</td></tr>`}</tbody>
    </table></div>
  </div>${rpFtr(d.campaign.campaign, 3)}</div>`
}

function videoIntroPage(i: number, v: ReportVideo, campaign: string): string {
  return `<div class="rpage">${rpHdr()}<div class="vi"><div class="vi-badge">VIDEO ${i}</div><div class="vi-title">${esc(v.title || 'Video ' + i)}</div></div>${rpFtr(campaign, i)}</div>`
}

function platformCard(v: ReportVideo, pl: Platform, campaign: string): string {
  const p = PLATFORMS.find((x) => x.key === pl)!
  const data = v[pl]
  const metrics = pl === 'facebook'
    ? [['Views', data.views], ['Reactions', data.reactions], ['Comments', data.comments], ['Shares', data.shares]]
    : [['Views', data.views], ['Likes', data.likes], ['Comments', data.comments], ['Shares', data.shares]]
  const cells = metrics.map(([lbl, val]) => `<div class="mcell"><div class="mval">${fmt(toNum(val))}</div><div class="mlbl">${lbl}</div></div>`).join('')
  const phone = v.thumbnail_url
    ? `<div class="phone"><img src="${esc(v.thumbnail_url)}" alt=""></div>`
    : `<div class="phone"><div class="phone-ph">No thumbnail</div></div>`
  return `<div class="rpage">${rpHdr()}<div class="pcard">
    <div class="pcard-l">${phone}</div>
    <div class="pcard-r">
      <div class="pcard-title" style="color:${p.color}">${p.label} <span style="color:var(--acc)">Report</span></div>
      <div class="pcard-vt">${esc(v.title || 'Video')}</div>
      <div class="pcard-date">${esc(data.date || '')}</div>
      <div class="mrow">${cells}</div>
    </div>
  </div>${rpFtr(campaign, 0)}</div>`
}

function thankYouPage(d: ReportData): string {
  const c = d.campaign
  const h = c.handle ? '@' + c.handle.replace(/^@/, '') : ''
  const contacts = [c.phone && `📞 <b>${esc(c.phone)}</b>`, c.email && `✉️ <b>${esc(c.email)}</b>`, h && `👤 <b>${esc(h)}</b>`].filter(Boolean).join('')
  return `<div class="rpage">${rpHdr()}
    <div class="ty"><div class="ty-l"><div class="ty-big">THANK<br>YOU</div><div class="ty-kol">${esc(c.kol || '')}</div></div><div class="ty-r"></div></div>
    <div class="ty-contacts">${contacts}</div></div>`
}

export function buildReportHTML(d: ReportData): string {
  const videos = Array.isArray(d.videos) ? d.videos : []
  const data: ReportData = { campaign: d.campaign, videos }
  let html = `<div class="kr-wrap">`
  html += coverPage(data)
  html += totalViewPage(data)
  html += engagementPage(data)
  videos.forEach((v, i) => {
    html += videoIntroPage(i + 1, v, data.campaign.campaign)
    PLATFORMS.forEach((p) => { if (plEnabled(v, p.key)) html += platformCard(v, p.key, data.campaign.campaign) })
  })
  html += thankYouPage(data)
  html += `</div>`
  return html
}

// Open a print window with just the report + styles, then trigger print → PDF.
export function printReport(d: ReportData) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!DOCTYPE html><html><head><title>${esc(d.campaign.campaign || 'Laporan')}</title>
    <style>
      @page{ size:A4 landscape; margin:0; }
      *{ -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
      body{ margin:0; background:#fff; }
      ${REPORT_STYLES}
      .rpage{ box-shadow:none!important; margin:0 auto!important; page-break-after:always; }
    </style></head><body>${buildReportHTML(d)}</body></html>`)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 400)
}
