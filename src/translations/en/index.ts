import { NestedRecord } from '..';

import home from './home';
import notes from './notes';
import articles from './articles';
import media from './media';
import account from './account';
import settings from './settings';
import profile from './profile';
import thread from './thread';
import notFound from './notFound';
import defaults from './defaults';


export default {
  home: home as NestedRecord,
  notes: notes as NestedRecord,
  articles: articles as NestedRecord,
  media: media as NestedRecord,
  account: account as NestedRecord,
  settings: settings as NestedRecord,
  profile: profile as NestedRecord,
  thread: thread as NestedRecord,
  notFound: notFound as NestedRecord,
  defaults: defaults as NestedRecord,
}
