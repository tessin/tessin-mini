// @flow

import React, { Component } from "react";

// Whether the components attached under the routes are loaded immediately or not vary depending on context

// if SSR then render synchrnous
// if not SSR then render asynchrnous
// data fetching must always happen before render
// all routing information has to be static to work with SSR (i.e. upfront knowledge)

// when you navigate a section, that section chunk has to be preloaded to prevent react from blanking the page, i.e. lazy loading the server-side rendered page
// with a bit of luck preloaded chunks should load synchronously!

const routes = [
  {
    path: "/dashboard/",
    chunkName: "dashboard",
    loadComponent: () =>
      import(/* webpackChunkName: "dashboard" */ "./dashboard/Dashboard")
  },
  // about section
  {
    path: "/about/careers",
    chunkName: "about",
    loadComponent: () =>
      import(/* webpackChunkName: "about" */ "./about/Careers")
  },
  {
    path: "/about/",
    chunkName: "about",
    loadComponent: () =>
      import(/* webpackChunkName: "about" */ "./about/About"),
    loadData: (dispatch, match) =>
      import(/* webpackChunkName: "about" */ "./about/actions").then(
        ({ fetchContactInformation }) => dispatch(fetchContactInformation())
      )
  },
  {
    path: "/",
    chunkName: "home",
    loadComponent: () => import(/* webpackChunkName: "home" */ "./home/Welcome")
  }
];

if (__SSR__) {
  // not necessary because you cannot navigate server-side
} else {
  class Bundle extends Component {
    state = {
      component: null
    };

    componentWillMount() {
      console.log("Bundle.componentWillMount");
      this.load(this.props);
    }

    componentWillReceiveProps(nextProps) {
      console.log("Bundle.componentWillReceiveProps");
      if (nextProps.load !== this.props.load) {
        this.load(nextProps);
      }
    }

    load(props) {
      this.setState({
        component: null
      });
      props.load().then(m => {
        this.setState({
          // handle both es6 imports and cjs
          component: m.default ? m.default : m
        });
      });
    }

    render() {
      if (!this.state.component) {
        return null;
      }
      const { load, ...props } = this.props;
      return React.createElement(this.state.component, props);
    }
  }

  // this snippet must vary depending on the type of build,
  // the client can use this lazy bundle component thing but the server cannot
  // it has to make sure the component code is loaded prior to the renderToString call
  routes.forEach(route => {
    route.component = props => <Bundle {...props} load={route.loadComponent} />;
  });
}

export default routes;
