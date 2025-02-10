import { FaPencilAlt } from "react-icons/fa";
import { BsEraserFill } from "react-icons/bs";
import { FaUndo } from "react-icons/fa";
import { FaRedo } from "react-icons/fa";
import { CgColorPicker } from "react-icons/cg"; 
import { FaDownload } from "react-icons/fa";

export const Toolbar = () => {

    return (
        <>
            <FaUndo />
            <FaPencilAlt />
            <BsEraserFill />
            <FaRedo />
            <CgColorPicker />
            <FaDownload />
        </>
    )
}