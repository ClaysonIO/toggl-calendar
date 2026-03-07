import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {projectLabel, ProjectOption} from "../Utilities/yearViewUtils";

export function YearProjectSelect({
    projects,
    value,
    onChange,
    title
}: {
    projects: ProjectOption[];
    value: number | null;
    onChange: (id: number | null) => void;
    title: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedProject = useMemo(
        () => projects.find((p) => p.id === value),
        [projects, value]
    );
    const displayLabel = selectedProject ? projectLabel(selectedProject) : "All projects";

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const sorted = [...projects].sort((a, b) => projectLabel(a).localeCompare(projectLabel(b)));
        if (!q) return sorted;
        return sorted.filter(
            (p) =>
                (p.name || "").toLowerCase().includes(q) ||
                (p.client_name || "").toLowerCase().includes(q)
        );
    }, [projects, query]);

    useEffect(() => {
        if (!open) return;
        const handle = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [open]);

    useEffect(() => {
        if (open) {
            setQuery("");
            inputRef.current?.focus();
        }
    }, [open]);

    const choose = useCallback(
        (id: number | null) => {
            onChange(id);
            setOpen(false);
        },
        [onChange]
    );

    return (
        <div className={"yearProjectSelectWrap"} ref={containerRef}>
            <button
                type={"button"}
                className={"yearProjectSelectTrigger"}
                onClick={() => setOpen((o) => !o)}
                title={title}
                aria-expanded={open}
                aria-haspopup={"listbox"}
            >
                <span className={"yearProjectSelectLabel"}>{displayLabel}</span>
                <span className={"yearProjectSelectChevron"} aria-hidden>▼</span>
            </button>
            {open && (
                <div className={"yearProjectSelectDropdown"} role={"listbox"}>
                    <input
                        ref={inputRef}
                        type={"text"}
                        className={"yearProjectSelectSearch"}
                        placeholder={"Search projects…"}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") setOpen(false);
                        }}
                        aria-label={"Search projects"}
                    />
                    <div className={"yearProjectSelectOptions"}>
                        <button
                            type={"button"}
                            className={`yearProjectSelectOption ${value === null ? "selected" : ""}`}
                            onClick={() => choose(null)}
                            role={"option"}
                            aria-selected={value === null}
                        >
                            All projects
                        </button>
                        {filtered.map((p) => (
                            <button
                                key={p.id}
                                type={"button"}
                                className={`yearProjectSelectOption ${value === p.id ? "selected" : ""}`}
                                onClick={() => choose(p.id)}
                                role={"option"}
                                aria-selected={value === p.id}
                            >
                                {projectLabel(p)}
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <div className={"yearProjectSelectEmpty"}>No projects match</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
