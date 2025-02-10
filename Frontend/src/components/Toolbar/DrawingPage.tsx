import { DrawingCanvas } from "../DrawingCanvas/DrawingCanvas"
import { Toolbar } from "./Toolbar"

export const DrawingPage = () => {

    return (
        <>
            <Toolbar></Toolbar>
            <DrawingCanvas></DrawingCanvas>
        </>
    )
}