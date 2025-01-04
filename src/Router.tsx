import { Component, lazy } from 'solid-js';
import { Router, Route } from "@solidjs/router";

import { PrimalWindow } from './primal';

const primalWindow = window as PrimalWindow;

const isDev = localStorage.getItem('devMode') === 'true';

const AppRouter: Component = () => {

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
  const NotFound = lazy(() => import('./pages/NotFound'));

  return (
      <Router root={AppLayout}>
        <Route path="/" component={Home} />
        <Route path="/home" component={Home} />
        <Route path="/reads" component={Reads} />
        <Route path="/explore" component={Explore} />
        <Route path="/messages" component={Messages} />
        <Route path="/bookmarks" component={Bookmarks} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/downloads" component={Downloads} />
        <Route path="/premium" component={Premium} />
        <Route path="/settings" component={Settings} />
        <Route path="/*" component={NotFound} />
      </Router>
  );
};

export default AppRouter;
