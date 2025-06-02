import { Component, lazy } from 'solid-js';
import { Router, Route, RoutePreloadFunc } from "@solidjs/router";

import { accountStore } from './stores/AccountStore';
import { preloadNotes } from './pages/Notes/Notes.data';
import { preloadHome } from './pages/Home/Home.data';
import { preloadArticles } from './pages/Articles/Articles.data';

const AppRouter: Component = () => {

  const AppLayout = lazy(() => import('./pages/AppLayout/AppLayout'));

  const Home = lazy(() => import('./pages/Home/Home'));
  const Notes = lazy(() => import('./pages/Notes/Notes'));
  const Articles = lazy(() => import('./pages/Articles/Articles'));
  const Media = lazy(() => import('./pages/Media/Media'));

  const Settings = lazy(() => import('./pages/Settings/Settings'));
  const SettingsMenu = lazy(() => import('./pages/Settings/Menu'));
  const SettingsAppearance = lazy(() => import('./pages/Settings/Appearance'));
  const SettingsMediaUploads = lazy(() => import('./pages/Settings/MediaUploads'));
  const SettingsNetwork = lazy(() => import('./pages/Settings/Network'));
  const SettingsImports = lazy(() => import('./pages/Settings/Imports'));
  const SettingsPermissions= lazy(() => import('./pages/Settings/Permissions'));

  const Account = lazy(() => import('./pages/Account/Account'));
  const Thread = lazy(() => import('./pages/Thread/Thread'));
  const Profile = lazy(() => import('./pages/Profile/Profile'));
  const ArticleEditorPage = lazy(() => import('./pages/ArticleEditorPage/ArticleEditorPage'));

  const NotFound = lazy(() => import('./pages/NotFound'));


  const homePreload: RoutePreloadFunc = (args) => preloadHome(args);
  const articlesPreload: RoutePreloadFunc = (args) => preloadArticles(args);
  const notesPreload: RoutePreloadFunc = (args) => preloadNotes(args);

  return (
    <Router root={AppLayout} preload={true}>
      <Route path="/:pubkey?" component={Home} preload={homePreload} />
      <Route path="/notes" component={Notes} preload={notesPreload}/>
      <Route path="/articles/:pubkey?" component={Articles} preload={articlesPreload} />
      <Route path="/media" component={Media} />
      <Route path="/account" component={Account} />
      <Route path="/settings" component={Settings}>
        <Route path="/" component={SettingsMenu} />
        <Route path="/appearance" component={SettingsAppearance} />
        <Route path="/uploads" component={SettingsMediaUploads} />
        <Route path="/network" component={SettingsNetwork} />
        <Route path="/imports" component={SettingsImports} />
        <Route path="/permissions" component={SettingsPermissions} />
      </Route>
      <Route path="/edit/article/:id?" component={ArticleEditorPage} />
      <Route path="/view/draft/:id?" component={ArticleEditorPage} />
      <Route path="/e/:id" component={Thread} />
      <Route path="/p/:id" component={Profile} />
      <Route path="/*" component={NotFound} />
    </Router>
  );
};

export default AppRouter;
