import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Athlete, Race, BoatLayout } from '../types';

export async function downloadCrewPdf(
  races: Race[],
  layouts: Record<string, BoatLayout>,
  athleteMap: Map<number, Athlete>,
  filename = 'crew-sheets.pdf'
) {
  const getName = (id: number | null) => {
    if (id === null) return '';
    return athleteMap.get(id)?.name ?? '?';
  };

  // Create a temporary container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);

  // Render each race as HTML
  for (const race of races) {
    const layout = layouts[race.id];
    if (!layout) continue;

    const paddlersFilled = layout.left.filter(Boolean).length + layout.right.filter(Boolean).length;
    const totalPaddlers = race.numRows * 2;

    let rows = '';
    rows += `<tr style="background:#fff8eb"><td class="seat">DR</td><td class="name">${getName(layout.drummer)}</td><td></td></tr>`;
    for (let i = 0; i < race.numRows; i++) {
      rows += `<tr><td class="seat">${i + 2}</td><td class="name">${getName(layout.left[i])}</td><td class="name">${getName(layout.right[i])}</td></tr>`;
    }
    rows += `<tr style="background:#fff8eb"><td class="seat">HM</td><td></td><td class="name">${getName(layout.helm)}</td></tr>`;

    const reserves = layout.reserves.length > 0
      ? `<p style="margin-top:10px;font-size:13px"><b>Reserves:</b> ${layout.reserves.map(id => getName(id)).filter(Boolean).join(', ')}</p>`
      : '';

    const page = document.createElement('div');
    page.style.width = '794px';
    page.style.padding = '40px';
    page.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    page.style.color = '#222';
    page.style.background = 'white';
    page.innerHTML = `
      <h2 style="font-size:20px;font-weight:bold;margin-bottom:4px">${race.name}</h2>
      <p style="font-size:12px;color:#888;margin-bottom:16px">${race.boatType === 'standard' ? 'Standard (20)' : 'Small (10)'} · ${race.distance} · ${paddlersFilled}/${totalPaddlers} paddlers</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr>
          <th style="border:1px solid #ccc;padding:5px 10px;background:#f0f0f0;width:40px;text-align:center;color:#555">Seat</th>
          <th style="border:1px solid #ccc;padding:5px 10px;background:#f0f0f0;text-align:left;color:#555">Left</th>
          <th style="border:1px solid #ccc;padding:5px 10px;background:#f0f0f0;text-align:left;color:#555">Right</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${reserves}
    `;

    // Inline styles for cells
    const style = document.createElement('style');
    style.textContent = `.seat{border:1px solid #ccc;padding:5px 10px;text-align:center;color:#999;font-size:11px;width:40px}.name{border:1px solid #ccc;padding:5px 10px;font-weight:500}td{border:1px solid #ccc;padding:5px 10px}`;
    page.prepend(style);

    container.appendChild(page);
  }

  // Convert to PDF
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pages = container.children;

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) doc.addPage();
    const canvas = await html2canvas(pages[i] as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
    const imgData = canvas.toDataURL('image/png');
    const pageWidth = 210;
    const pageHeight = (canvas.height * pageWidth) / canvas.width;
    doc.addImage(imgData, 'PNG', 0, 0, pageWidth, Math.min(pageHeight, 297));
  }

  doc.save(filename);
  document.body.removeChild(container);
}
