import { Component, lazy } from 'solid-js';
import { Router, Route } from "@solidjs/router";

import { accountStore } from './stores/AccountStore';
import preloadNotes from './pages/Notes/Notes.data';

const AppRouter: Component = () => {

  const AppLayout = lazy(() => import('./pages/AppLayout/AppLayout'));
  const Home = lazy(() => import('./pages/Home/Home'));
  const Notes = lazy(() => import('./pages/Notes/Notes'));
  const Articles = lazy(() => import('./pages/Articles/Articles'));
  const Media = lazy(() => import('./pages/Media/Media'));
  const Account = lazy(() => import('./pages/Account/Account'));
  const Settings = lazy(() => import('./pages/Settings/Settings'));
  const SettingsMenu = lazy(() => import('./pages/Settings/Menu'));
  const SettingsAppearance = lazy(() => import('./pages/Settings/Appearance'));
  const Thread = lazy(() => import('./pages/Thread/Thread'));
  const Profile = lazy(() => import('./pages/Profile/Profile'));
  const NotFound = lazy(() => import('./pages/NotFound'));

  const notesPreload = () => preloadNotes(accountStore.pubkey);

  return (
    <Router root={AppLayout} preload={true}>
      <Route path="/" component={Home} />
      <Route path="/notes" component={Notes} preload={notesPreload}/>
      <Route path="/articles" component={Articles} />
      <Route path="/media" component={Media} />
      <Route path="/account" component={Account} />
      <Route path="/settings" component={Settings}>
        <Route path="/" component={SettingsMenu} />
        <Route path="/appearance" component={SettingsAppearance} />
      </Route>
      <Route path="/e/:id" component={Thread} />
      <Route path="/p/:id" component={Profile} />
      <Route path="/*" component={NotFound} />
    </Router>
  );
};

export default AppRouter;
