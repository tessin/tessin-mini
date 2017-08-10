import React, { Component } from "react";

import { Link, Switch, Route } from "react-router-dom";
import { Helmet } from "react-helmet";

function A() {
  return <h1>A</h1>;
}

function B() {
  return <h1>B</h1>;
}

export default class Welcome extends Component {
  render() {
    return (
      <div>
        <Helmet>
          <title>Welcome bienvenue!</title>
        </Helmet>

        <p>
          Welcome to our humble establishment. We are happy that you are here.
        </p>

        <nav>
          <ul>
            <li>
              <Link to="/home/a">A</Link>
            </li>
            <li>
              <Link to="/home/b">B</Link>
            </li>
          </ul>
        </nav>

        <Switch>
          <Route path="/home/a" component={A} />
          <Route path="/home/b" component={B} />
        </Switch>
      </div>
    );
  }
}
