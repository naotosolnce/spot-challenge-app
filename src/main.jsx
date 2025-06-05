import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  // 問題切り分けのためStrictModeを外してもOK
  //<React.StrictMode>
    <App />
  //</React.StrictMode>
)
