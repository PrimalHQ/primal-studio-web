import * as home from './home';
import * as reads from './reads';
import * as explore from './explore';
import * as messages from './messages';
import * as bookmarks from './bookmarks';
import * as notifications from './notifications';
import * as downloads from './downloads';
import * as premium from './premium';
import * as settings from './settings';
import * as notFound from './notFound';


export default {
  home: home as Record<string, string>,
  reads: reads as Record<string, string>,
  explore: explore as Record<string, string>,
  messages: messages as Record<string, string>,
  bookmarks: bookmarks as Record<string, string>,
  notifications: notifications as Record<string, string>,
  downloads: downloads as Record<string, string>,
  premium: premium as Record<string, string>,
  settings: settings as Record<string, string>,
  notFound: notFound as Record<string, string>,
}
