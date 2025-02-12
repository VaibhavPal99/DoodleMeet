import { useState } from "react";
import { FaPencilAlt, FaUndo, FaRedo, FaDownload, FaCopy, FaSignOutAlt, FaArrowsAltH } from "react-icons/fa";
import { BsEraserFill } from "react-icons/bs";

import "./Toolbar.css";

interface ToolbarProps {
  setToDraw: () => void;  
  setToErase: () => void;
  onColorChange: (color: string) => void;
  onCopyRoomId: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onLeaveRoom: () => void;
  onSizeChange: (size: number) => void;
  onDownload : () => void
}

export const Toolbar = ({ setToDraw, setToErase, onColorChange, onCopyRoomId, onUndo, onRedo, onLeaveRoom, onSizeChange, onDownload }: ToolbarProps) => {
  const [showSlider, setShowSlider] = useState(false); // State to toggle slider visibility

  return (
    <div className="toolbar">

      <button className="tool-button" title="Undo" onClick={onUndo}><FaUndo /></button>

      <button className="tool-button" title="Redo" onClick={onRedo}><FaRedo /></button>
      
      <button className="tool-button" title="Pencil" onClick={setToDraw}><FaPencilAlt /></button>
      
      <button className="tool-button" title="Eraser" onClick={setToErase}><BsEraserFill /></button>
      
      <input type="color" className="tool-button" title="Color Picker" onChange={(e) => onColorChange(e.target.value)} />
      
      <button className="tool-button" title="Download" onClick={onDownload}><FaDownload /></button>
      
      <button className="tool-button" title="Copy Room ID" onClick={onCopyRoomId}><FaCopy /></button>

      <button className="tool-button" title="Brush Size" onClick={() => setShowSlider(!showSlider)}>
        <FaArrowsAltH />
      </button>

      {showSlider && (
        <input type="range" min="1" max="10" defaultValue="5" className="slider" title="Brush Size" 
          onChange={(e) => onSizeChange(Number(e.target.value))} />
      )}

      <button className="tool-button leave-button" title="Leave Room" onClick={onLeaveRoom}><FaSignOutAlt /></button>
    </div>
  );
};
