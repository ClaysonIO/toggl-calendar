import React from "react";

export const CalendarCell = ({text}: { text?: string | React.ReactElement | React.ReactElement[] }) => {
    function copyToClipboard(event: React.MouseEvent) {
        const range = document.createRange();
        const textNode = event.currentTarget;
        if (textNode) {
            range.selectNode(textNode);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(range);
            document.execCommand("copy");
        }
    }

    return (
        <td className={'dateCol'}>
            <button onClick={copyToClipboard}>
                {text}
            </button>
        </td>)
}