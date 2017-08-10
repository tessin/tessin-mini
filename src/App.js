import React, { Component } from "react";
import { Provider } from "react-redux";

import { Link, Switch, Route } from "react-router-dom";

import styles from "./App.css";


class ErrorBoundary extends Component {
  constructor(props) {
    super(props)

    this.state = { hasError: false }
  }

  componentDidCatch(error, info) {
    this.setState({
      hasError: true,
      error,
      info
    })
  }

  render() {
    const { hasError, error, info } = this.state
    if (hasError) {
      return (
        <div>
          <h2>Ajdå, nu blev det fel.</h2>
          <p>Varning! Tekniska detaljer följer:</p>
          <pre>
            <code>
              {error.message}
            </code>
          </pre>
          <pre>
            <code>
              {error.stack}
            </code>
          </pre>
          <pre>
            <code>
              {info.componentStack}
            </code>
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

function withErrorBoundary() {
  return Component => props =>
    <ErrorBoundary>
      <Component {...props} />
    </ErrorBoundary>
}

// function withErrorBoundary() {
//   return Component => props => <Component {...props} />
// }

function Main({ routes }) {
  return (
    <div className={styles.bg}>
      <div>
        <nav>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/about/">About us</Link>
            </li>
            <li>
              <Link to="/dashboard">Dashboard</Link>
            </li>
          </ul>
        </nav>
      </div>
      <div>
        <Switch>
          {routes.map((route, index) =>
            <Route
              key={index}
              path={route.path}
              exact={route.exact}
              component={withErrorBoundary()(route.component)}
            />
          )}
        </Switch>
      </div>
    </div>
  );
}

export default class App extends Component {
  render() {
    const {
      store,
      router: Router,
      routes,
      history,
      location,
      context
    } = this.props;

    if (__SSR__) {
      return (
        <Provider store={store}>
          <Router location={location} context={context}>
            <Main routes={routes} />
          </Router>
        </Provider>
      );
    } else {
      return (
        <Provider store={store}>
          <Router history={history}>
            <Main routes={routes} />
          </Router>
        </Provider>
      );
    }
  }
}
