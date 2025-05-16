import home from './home';
import notes from './notes';
import articles from './articles';
import media from './media';
import account from './account';
import settings from './settings';
import profile from './profile';
import thread from './thread';
import notFound from './notFound';


export default {
  home: home as Record<string, string>,
  notes: notes as Record<string, string>,
  articles: articles as Record<string, string>,
  media: media as Record<string, string>,
  account: account as Record<string, string>,
  settings: settings as Record<string, string>,
  profile: profile as Record<string, string>,
  thread: thread as Record<string, string>,
  notFound: notFound as Record<string, string>,
}
