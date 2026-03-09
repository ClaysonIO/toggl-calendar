import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
    MDXEditor,
    MDXEditorMethods,
    headingsPlugin,
    listsPlugin,
    quotePlugin,
    thematicBreakPlugin,
    markdownShortcutPlugin,
    linkPlugin,
    linkDialogPlugin,
    toolbarPlugin,
    BoldItalicUnderlineToggles,
    UndoRedo,
    BlockTypeSelect,
    CreateLink,
    ListsToggle,
    Separator
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import {calendarDb, getProjectNoteKey, IProjectNote} from "../Utilities/calendarDb";
import {useLiveQuery} from "dexie-react-hooks";
import "./ProjectNotesDialog.css";

const useIsDarkMode = () => {
    const [dark, setDark] = useState(
        () => document.documentElement.getAttribute("data-theme") === "dark"
    );
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setDark(document.documentElement.getAttribute("data-theme") === "dark");
        });
        observer.observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]});
        return () => observer.disconnect();
    }, []);
    return dark;
};

interface ProjectNotesDialogProps {
    open: boolean;
    onClose: () => void;
    workspaceId: number;
    projectId: number;
    projectName: string;
    projectColor: string;
    weeklyHours: number;
    projectedHours: number;
    lifetimeHours: number;
    taskDescriptions: string[];
    formatHours: (h: number) => string;
}

const DEBOUNCE_MS = 800;

const TaskHistoryPanel = React.memo(({descriptions, visible, onToggle}: {
    descriptions: string[];
    visible: boolean;
    onToggle: () => void;
}) => (
    <div className={`notesHistoryPanel ${visible ? "open" : "collapsed"}`}>
        <button className="notesHistoryToggle" type="button" onClick={onToggle}>
            {visible ? "Hide History \u25B8" : "\u25C2 History"}
        </button>
        {visible && (
            <div className="notesHistoryContent">
                <h4 className="notesHistoryTitle">Task Descriptions</h4>
                {descriptions.length ? (
                    <ul className="notesHistoryList">
                        {descriptions.map((desc, i) => (
                            <li key={i} className="notesHistoryItem">{desc}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="notesHistoryEmpty">No task descriptions recorded.</p>
                )}
            </div>
        )}
    </div>
));

export const ProjectNotesDialog = ({
    open,
    onClose,
    workspaceId,
    projectId,
    projectName,
    projectColor,
    weeklyHours,
    projectedHours,
    lifetimeHours,
    taskDescriptions,
    formatHours
}: ProjectNotesDialogProps) => {
    const editorRef = useRef<MDXEditorMethods>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const [historyVisible, setHistoryVisible] = useState(false);
    const isDark = useIsDarkMode();
    const noteKey = useMemo(() => getProjectNoteKey(workspaceId, projectId), [workspaceId, projectId]);
    const latestMarkdownRef = useRef<string | null>(null);

    const existingNote = useLiveQuery(
        () => calendarDb.projectNotes.get(noteKey),
        [noteKey]
    );

    const initialMarkdown = existingNote?.notes ?? "";

    useEffect(() => {
        if (open && editorRef.current) {
            editorRef.current.setMarkdown(initialMarkdown);
            latestMarkdownRef.current = initialMarkdown;
        }
    }, [open, noteKey, initialMarkdown]);

    const saveNotes = useCallback(async (markdown: string) => {
        await calendarDb.projectNotes.put({
            key: noteKey,
            workspaceId,
            projectId,
            notes: markdown,
            updatedAt: Date.now()
        } as IProjectNote);
    }, [noteKey, workspaceId, projectId]);

    const handleChange = useCallback((markdown: string) => {
        latestMarkdownRef.current = markdown;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            void saveNotes(markdown);
        }, DEBOUNCE_MS);
    }, [saveNotes]);

    const handleClose = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (latestMarkdownRef.current !== null) {
            void saveNotes(latestMarkdownRef.current);
        }
        onClose();
    }, [onClose, saveNotes]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, handleClose]);

    const handleEditorContainerClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (editorContainerRef.current && editorRef.current) {
            const contentEditable = editorContainerRef.current.querySelector("[contenteditable]") as HTMLElement | null;
            if (contentEditable && !contentEditable.contains(target) && !target.closest("[role='toolbar']")) {
                editorRef.current.focus();
            }
        }
    }, []);

    if (!open) return null;

    return (
        <div className="notesDialogOverlay" onClick={handleClose}>
            <div className="notesDialog" onClick={e => e.stopPropagation()}>
                <div className="notesDialogHeader">
                    <div className="notesDialogProjectInfo">
                        <h2 className="notesDialogProjectName" style={{color: projectColor}}>
                            {projectName}
                        </h2>
                        <div className="notesDialogStats">
                            <span><strong>This week:</strong> {formatHours(weeklyHours)}</span>
                            <span><strong>Projected:</strong> {formatHours(projectedHours)}</span>
                            <span><strong>Lifetime:</strong> {formatHours(lifetimeHours)}</span>
                        </div>
                    </div>
                    <button className="notesDialogClose" onClick={handleClose} type="button">&times;</button>
                </div>
                <div className="notesDialogBody">
                    <div className="notesEditorContainer" ref={editorContainerRef} onClick={handleEditorContainerClick}>
                        <MDXEditor
                            ref={editorRef}
                            className={isDark ? "dark-theme" : ""}
                            markdown={initialMarkdown}
                            onChange={handleChange}
                            plugins={[
                                headingsPlugin(),
                                listsPlugin(),
                                quotePlugin(),
                                thematicBreakPlugin(),
                                markdownShortcutPlugin(),
                                linkPlugin(),
                                linkDialogPlugin(),
                                toolbarPlugin({
                                    toolbarContents: () => (
                                        <>
                                            <UndoRedo/>
                                            <Separator/>
                                            <BoldItalicUnderlineToggles/>
                                            <Separator/>
                                            <BlockTypeSelect/>
                                            <Separator/>
                                            <ListsToggle/>
                                            <Separator/>
                                            <CreateLink/>
                                        </>
                                    )
                                })
                            ]}
                            contentEditableClassName="notesEditorContent"
                        />
                    </div>
                    <TaskHistoryPanel
                        descriptions={taskDescriptions}
                        visible={historyVisible}
                        onToggle={() => setHistoryVisible(v => !v)}
                    />
                </div>
            </div>
        </div>
    );
};
