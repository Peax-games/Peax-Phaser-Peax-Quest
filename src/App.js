import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import PeaxQuest from './Game/Peax-Quest';

class App extends Component {
  render() {
    PeaxQuest();
    return (
      <div id="myCanvas">
        
      </div>
    );
  }
}

export default App;
