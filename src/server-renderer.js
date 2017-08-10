// @flow

import routes from "./routes";
import { matchRoutes } from "react-router-config";

export async function render(req, res, { stats }) {
  // webpackChunkName is a directive that tells webpack that the package is found in a chunk with a specific name
  // it's important because it allows code splitting and faster incremental recompilation, if no chunk name is given
  // the chunk will be given an implicit name

  const React = await import(/* webpackChunkName: "react" */ "react");
  const {
    renderToString
  } = await import(/* webpackChunkName: "react" */ "react-dom/server");

  const { createStore } = await import("redux");

  const { StaticRouter } = await import("react-router");
  const createHistory = (await import("history/createMemoryHistory")).default;

  const reducer = (await import("./reducer")).default;

  const Helmet = (await import("react-helmet")).default;

  //
  // INIT
  // ================

  const store = createStore(reducer, {});

  const history = createHistory();

  const matches = matchRoutes(routes, req.url);

  console.log(req.url, "->", matches);

  await Promise.all(
    matches.map(match =>
      match.route.loadComponent().then(m => {
        match.route.component = m.default ? m.default : m;
      })
    )
  );

  const App = (await import("./App")).default;

  console.time("renderToString");

  const html = renderToString(
    <App
      store={store}
      router={StaticRouter}
      routes={routes}
      history={history}
      location={req.url}
      context={{}}
    />
  );

  const helmet = Helmet.renderStatic();

  console.timeEnd("renderToString");

  const { entrypoints, assetsByChunkName } = stats;
  const assets = [...entrypoints.app.assets];

  // this depends on what section of the site is "active"

  if (matches.length > 0) {
    const activeChunkName = matches[0].route.chunkName;
    if (activeChunkName) {
      let insertAt = assets.length - 1;
      if (assets[assets.length - 1].endsWith(".hot-update.js")) {
        insertAt--;
      }
      insertAt--;
      assets.splice(insertAt, 0, assetsByChunkName[activeChunkName]);
    } else {
      console.warn(
        `WARNING: url '${req.url}' route does not define a 'chunkName'!`
      );
    }
  } else {
    console.warn(`WARNING: url '${req.url}' does not match any routes`); // => 404
  }

  // the scripts are injected at the end, this does not block initial render

  // the loader order is defined by the entry points
  const assets2 = Array.prototype.concat.apply([], assets);

  const jsAssets = assets2.filter(fn => fn.endsWith(".js"));
  const cssAssets = assets2.filter(fn => fn.endsWith(".css"));

  const body = [
    "<!doctype html>",
    "<html>",
    "<head>",
    helmet.title.toString(),
    helmet.meta.toString(),
    ...cssAssets.map(
      fn => `<link href="/static/${fn}" media="screen" rel="stylesheet" />`
    ),
    helmet.link.toString(),
    "</head>",
    "<body>",
    `<div id="root">${html}</div>`,
    ...jsAssets.map(fn => `<script src="/static/${fn}"></script>`),
    "</body>",
    "</html>"
  ];

  res.send(body.join("\n"));
}

export async function renderError(req, res, { reason }) {
  const React = await import("react");
  const { renderToString } = await import("react-dom/server");

  const html = renderToString(
    <html>
      <body>
        <h1>Server-side 'render' function error</h1>
        <h2>
          {reason.message}
        </h2>
        <pre>
          <code>
            {reason.stack}
          </code>
        </pre>
      </body>
    </html>
  );

  res.send(html);
}
