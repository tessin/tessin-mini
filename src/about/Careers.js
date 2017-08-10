import React, { Component } from "react";

import { Link, Switch, Route } from "react-router-dom";

function Careers() {
  return <p>So you want to work here? You sure about that?</p>;
}

export default class About extends Component {
  render() {
    return (
      <div>
        <h1>About us - Careers</h1>

        <nav>
          <ul>
            <li>
              <Link to="/about/">Index</Link>
            </li>
            <li>
              <Link to="/about/careers/">Careers</Link>
            </li>
          </ul>
        </nav>

        <Switch>
          <Route path="/about/careers/" component={Careers} />
        </Switch>
      </div>
    );
  }
}
