import React, { Component } from "react";

import { Link, Switch, Route } from "react-router-dom";

import { connect } from "react-redux";

import { fetchContactInformation } from "./actions.js";

// import styles from "./About.css";

function Index() {
  return (
    <p>
      We're a small company that tries to do big things with the limited
      resources that we have. We belive in working smart but sometimes that
      requires a lot of hard work.
    </p>
  );
}

class About extends Component {
  componentDidMount() {
    console.log(
      "componentDidMount",
      this.props.dispatch(fetchContactInformation({}))
    );
  }

  render() {
    return (
      <div className={styles.fg}>
        <h1>About us</h1>

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
          <Route path="/about/" component={Index} />
        </Switch>
      </div>
    );
  }
}

export default connect()(connect);
