import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Home } from "./components/Home/Home"

import { DrawingCanvas } from "./components/DrawingCanvas/DrawingCanvas"





function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/room/:id" element={<DrawingCanvas/>}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App
