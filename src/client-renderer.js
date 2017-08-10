import React from "react";
import { render } from "react-dom";

import App from "./App";

import { createStore } from "redux";

import reducer from "./reducer";
const store = createStore(reducer, {});

import { Router } from "react-router";
import createHistory from "history/createBrowserHistory";

const history = createHistory();

import routes from "./routes";
import { matchRoutes } from "react-router-config";

function present(App, routes) {
  // the things that change, i.e. are hot

  const matches = matchRoutes(routes, window.location.pathname);

  // ensure that the bundle is loaded before initial render,
  // otherwise the client will unmount what the server just rendered

  Promise.all(
    matches.map(match =>
      match.route
        .loadComponent()
        .then(m => (match.route.component = m.default ? m.default : m))
    )
  ).then(() => {
    render(
      <App store={store} router={Router} routes={routes} history={history} />,
      document.getElementById("root")
    );
  });
}

present(App, routes);

if (module.hot) {
  module.hot.accept("./App", () => {
    const App2 = require("./App").default;
    present(App2, routes);
  });

  module.hot.accept("./routes", () => {
    const routes2 = require("./routes").default;
    present(App, routes2);
  });

  module.hot.accept("./reducer", () => {
    const reducer2 = require("./reducer").default;
    store.replaceReducer(reducer2);
  });
}
