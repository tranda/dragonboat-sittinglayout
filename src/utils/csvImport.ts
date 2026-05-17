export interface IdbfCsvRow {
  pin: string;
  family_name: string;
  first_name: string;
  gender: string;
  birth_date: string;
  document_no: string;
  left_side: boolean;
  right_side: boolean;
  drummer: boolean;
  helm: boolean;
  athlete: boolean;
  coach: boolean;
  media: boolean;
  official: boolean;
  supporter: boolean;
  paradragon: boolean;
  club_membership_no: string;
  date_joined_club: string;
  club_ibcpc: string;
  club_country: string;
  club_name: string;
  hidden: string;
}

function decodeFile(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.slice(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.slice(2));
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.slice(3));
  }
  return new TextDecoder('utf-8').decode(bytes);
}

export async function parseIdbfCsv(file: File): Promise<IdbfCsvRow[]> {
  const buf = await file.arrayBuffer();
  const text = decodeFile(new Uint8Array(buf));
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const header = lines[0].split(delimiter).map(h => h.trim());
  const idx = (name: string) => header.indexOf(name);
  const flag = (v: string) => v.trim().toLowerCase() === 'x';

  return lines.slice(1).map(line => {
    const cells = line.split(delimiter);
    const get = (name: string) => (cells[idx(name)] ?? '').trim();
    return {
      pin: get('pin'),
      family_name: get('family_name'),
      first_name: get('first_name'),
      gender: get('gender'),
      birth_date: get('birth_date'),
      document_no: get('document_no'),
      left_side: flag(get('left_side')),
      right_side: flag(get('right_side')),
      drummer: flag(get('drummer')),
      helm: flag(get('helm')),
      athlete: flag(get('athlete')),
      coach: flag(get('coach')),
      media: flag(get('media')),
      official: flag(get('official')),
      supporter: flag(get('supporter')),
      paradragon: flag(get('paradragon')),
      club_membership_no: get('club_membership_no'),
      date_joined_club: get('date_joined_club'),
      club_ibcpc: get('club_ibcpc'),
      club_country: get('club_country'),
      club_name: get('club_name'),
      hidden: get('hidden'),
    };
  });
}
