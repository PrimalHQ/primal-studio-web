import { Kind } from "src/constants";
import { PrimalArticle, PrimalNote, PrimalUser, PrimalZap } from "src/primal";

export const parseBolt11 = (bolt11: string) => {
  if (!bolt11.startsWith('lnbc')) return;

  let digits: string[] = [];
  let unit: string = '';

  let i = 4;

  do {
    const char = bolt11[i];
    const n = parseInt(char);
    if (n !== 0 && !n) {
      break;
    }
    digits.push(char);
    i++;
  } while(i < bolt11.length);

  unit = bolt11[i];
  const number = parseInt(digits.join(''));
  let amount = number * 100_000_000;

  switch(unit) {
    case 'm':
      amount = amount / 1_000;
      break;
    case 'u':
      amount = amount / 1_000_000;
      break;
    case 'n':
      amount = amount / 1_000_000_000;
      break;
    case 'p':
      amount = amount / 1_000_000_000_000;
      break;
    default:
      amount = amount;
      break;
  }

  return amount;
}

export const extractSubjectFromZap = (
  zap: PrimalZap,
  mentions: {
    notes: PrimalNote[],
    reads: PrimalArticle[],
    users: PrimalUser[],
  },
): PrimalNote | PrimalArticle |  PrimalUser | undefined => {
    let zapSubject: PrimalNote | PrimalArticle | PrimalUser | undefined;

    if (zap.zappedKind === Kind.LongForm) {
      zapSubject = mentions.reads.find(r => r.id === zap.zappedId);
    }
    if (zap.zappedKind === Kind.Text) {
      zapSubject = mentions.notes.find(n => n.id === zap.zappedId);
    }
    if (zap.zappedKind === Kind.Metadata) {
      zapSubject = mentions.users.find(u => u.pubkey === zap.zappedId);
    }

    return zapSubject;
}
