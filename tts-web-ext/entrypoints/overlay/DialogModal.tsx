// Attribution: https://dev.to/elsyng/react-modal-dialog-using-html-dialog-element-5afk
import { MouseEvent, useEffect, useRef } from "react";
import './style.css';

const isClickInsideRectangle = (e: MouseEvent, element: HTMLElement) => {
  const r = element.getBoundingClientRect();
  return (
    e.clientX > r.left &&
    e.clientX < r.right &&
    e.clientY > r.top &&
    e.clientY < r.bottom
  );
};

type Props = {
  title: string;
  isOpened: boolean;
  // onProceed: () => void;
  onClose: () => void;
  children: React.ReactNode;
};

const DialogModal = ({
  title,
  isOpened,
  // onProceed,
  onClose,
  children,
}: Props) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpened) {
      ref.current?.showModal();
      document.body.classList.add("modal-open"); // prevent bg scroll
    } else {
      ref.current?.close();
      document.body.classList.remove("modal-open");
    }
  }, [isOpened]);

  const proceedAndClose = () => {
    // onProceed();
    onClose();
  };

  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) =>
        ref.current && !isClickInsideRectangle(e, ref.current) && onClose()
      }
      className="dialog-container"
    >
      <h3>{title}</h3>

      {children}

      <div>
        {/* <button onClick={proceedAndClose}>Proceed</button> */}
        <button onClick={onClose}>Close</button>
      </div>
    </dialog>
  );
};

export default DialogModal;
