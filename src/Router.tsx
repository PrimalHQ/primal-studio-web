import { Component, lazy } from 'solid-js';
import { Router, Route } from "@solidjs/router";

import preloadHome from './pages/Home/Home.data';
import { useAccountContext } from './context/AccountContext';

const AppRouter: Component = () => {
  const account = useAccountContext()

  const AppLayout = lazy(() => import('./pages/AppLayout/AppLayout'));
  const Home = lazy(() => import('./pages/Home/Home'));
  const Reads = lazy(() => import('./pages/Reads/Reads'));
  const Explore = lazy(() => import('./pages/Explore/Explore'));
  const Messages = lazy(() => import('./pages/Messages/Messages'));
  const Bookmarks = lazy(() => import('./pages/Bookmarks/Bookmarks'));
  const Notifications = lazy(() => import('./pages/Notifications/Notifications'));
  const Downloads = lazy(() => import('./pages/Downloads/Downloads'));
  const Premium = lazy(() => import('./pages/Premium/Premium'));
  const Settings = lazy(() => import('./pages/Settings/Settings'));
  const Thread = lazy(() => import('./pages/Thread/Thread'));
  const NotFound = lazy(() => import('./pages/NotFound'));

  const homePreload = () => preloadHome(account?.pubkey);

  return (
    <Router root={AppLayout} preload={true}>
      <Route path="/" component={Home} preload={homePreload} />
      <Route path="/home" component={Home} preload={homePreload}/>
      <Route path="/reads" component={Reads} />
      <Route path="/explore" component={Explore} />
      <Route path="/messages" component={Messages} />
      <Route path="/bookmarks" component={Bookmarks} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/downloads" component={Downloads} />
      <Route path="/premium" component={Premium} />
      <Route path="/settings" component={Settings} />
      <Route path="/e/:id" component={Thread} />
      <Route path="/*" component={NotFound} />
    </Router>
  );
};

export default AppRouter;
