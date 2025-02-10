import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Home } from "./components/DrawingCanvas/Home"
import { DrawingPage } from "./components/Toolbar/DrawingPage"





function App() {

  
  

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/room/:id" element={<DrawingPage/>}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App
