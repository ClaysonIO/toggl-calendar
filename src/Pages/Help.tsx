import React, {useCallback, useState} from "react";
import ReactMarkdown from "react-markdown";
import {Layout} from "../Components/Layout";
import helpMarkdown from "../content/help.md?raw";
import "./Help.css";

interface HelpItem {
    section: string;
    question: string;
    answer: string;
}

function parseHelpMarkdown(md: string): HelpItem[] {
    const normalized = md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const items: HelpItem[] = [];
    const sectionBlocks = normalized.split(/\n## /);
    for (let i = 1; i < sectionBlocks.length; i++) {
        const block = sectionBlocks[i];
        const firstNewline = block.indexOf("\n");
        const section = firstNewline === -1 ? block.trim() : block.slice(0, firstNewline).trim();
        const sectionBody = firstNewline === -1 ? "" : block.slice(firstNewline + 1);
        const questionBlocks = sectionBody.split(/\n### /);
        for (let j = 1; j < questionBlocks.length; j++) {
            const qBlock = questionBlocks[j].trim();
            const lineEnd = qBlock.indexOf("\n\n");
            const question = lineEnd === -1 ? qBlock : qBlock.slice(0, lineEnd);
            const answer = lineEnd === -1 ? "" : qBlock.slice(lineEnd + 2).trim();
            items.push({ section, question, answer });
        }
    }
    return items;
}

const helpItems = parseHelpMarkdown(helpMarkdown);

export const HelpPage = () => {
    const [openId, setOpenId] = useState<string | null>(null);
    const toggle = useCallback((id: string) => {
        setOpenId((prev) => (prev === id ? null : id));
    }, []);

    let sectionKey = "";
    return (
        <Layout>
            <div className={"helpPage"}>
                <h1>Help</h1>
                <div className={"helpAccordion"}>
                    {helpItems.map((item, index) => {
                        const id = `help-${index}`;
                        const isOpen = openId === id;
                        const showSection = sectionKey !== item.section;
                        if (showSection) sectionKey = item.section;
                        return (
                            <React.Fragment key={id}>
                                {showSection && (
                                    <h2 className={"helpAccordionSection"}>{item.section}</h2>
                                )}
                                <div className={`helpAccordionItem ${isOpen ? "open" : ""}`}>
                                    <button
                                        type={"button"}
                                        className={"helpAccordionQuestion"}
                                        onClick={() => toggle(id)}
                                        aria-expanded={isOpen}
                                        aria-controls={`${id}-answer`}
                                        aria-label={item.question}
                                        id={`${id}-question`}
                                    >
                                        <span>{item.question}</span>
                                        <span className={"helpAccordionIcon"} aria-hidden>{isOpen ? "−" : "+"}</span>
                                    </button>
                                    <div
                                        id={`${id}-answer`}
                                        className={"helpAccordionAnswer"}
                                        role={"region"}
                                        aria-labelledby={`${id}-question`}
                                        aria-hidden={!isOpen}
                                        hidden={!isOpen}
                                    >
                                        <div className={"helpAccordionAnswerInner"}>
                                            <ReactMarkdown>{item.answer}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </Layout>
    );
};
