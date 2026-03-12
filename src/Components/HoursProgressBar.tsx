import React, {useState} from "react";
import "./HoursProgressBar.css";

export interface IHoursProgressBarProps {
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    targetBillableHours: number;
    onClickBillableTarget?: () => void;
}

const formatHoursForPopover = (h: number) =>
    Number.isInteger(h) ? String(h) : h.toFixed(2);

export const HoursProgressBar = React.memo(({
    totalHours,
    billableHours,
    nonBillableHours,
    targetBillableHours,
    onClickBillableTarget
}: IHoursProgressBarProps) => {
    const [barHover, setBarHover] = useState(false);
    const [markerHover, setMarkerHover] = useState(false);

    const billablePct = totalHours > 0
        ? Math.min(100, (billableHours / totalHours) * 100)
        : 0;
    const remainingForNonBillable = Math.max(0, 100 - billablePct);
    const nonBillablePct = totalHours > 0
        ? Math.min(remainingForNonBillable, (nonBillableHours / totalHours) * 100)
        : 0;
    const targetPct = totalHours > 0
        ? Math.min(100, Math.max(0, (targetBillableHours / totalHours) * 100))
        : 0;

    return (
        <div
            className={"hoursProgressBar"}
            role={"img"}
            aria-label={`Progress toward target hours: ${billablePct.toFixed(0)}% billable, ${nonBillablePct.toFixed(0)}% non-billable`}
        >
            <div
                className={"hoursProgressBarTrack"}
                onMouseEnter={() => setBarHover(true)}
                onMouseLeave={() => setBarHover(false)}
            >
                {billablePct > 0 && (
                    <div
                        className={"hoursProgressBarBillable"}
                        style={{ width: `${billablePct}%` }}
                    />
                )}
                {nonBillablePct > 0 && (
                    <div
                        className={"hoursProgressBarNonBillable"}
                        style={{ width: `${nonBillablePct}%` }}
                    />
                )}
                {totalHours > 0 && (
                    <div
                        className={`hoursProgressBarTargetMarker${onClickBillableTarget ? " hoursProgressBarTargetMarkerClickable" : ""}${targetPct <= 0 ? " hoursProgressBarTargetMarkerAtStart" : ""}${targetPct >= 100 ? " hoursProgressBarTargetMarkerAtEnd" : ""}`}
                        style={
                            targetPct <= 0
                                ? { left: 0 }
                                : targetPct >= 100
                                    ? { right: 0, left: "auto" }
                                    : { left: `${targetPct}%`, marginLeft: -4 }
                        }
                        aria-label={"Target billable hours"}
                        onMouseEnter={() => setMarkerHover(true)}
                        onMouseLeave={() => setMarkerHover(false)}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClickBillableTarget?.();
                        }}
                    />
                )}
            </div>
            {barHover && !markerHover && (
                <div
                    className={"hoursProgressBarPopover"}
                    role={"dialog"}
                    aria-label={"Progress bar values"}
                >
                    <dl>
                        <dt>Total hours</dt>
                        <dd>{formatHoursForPopover(totalHours)}</dd>
                        <dt>Billable</dt>
                        <dd>{formatHoursForPopover(billableHours)}</dd>
                        <dt>Non-billable</dt>
                        <dd>{formatHoursForPopover(nonBillableHours)}</dd>
                        <dt>Target billable</dt>
                        <dd>{formatHoursForPopover(targetBillableHours)}</dd>
                    </dl>
                </div>
            )}
            {markerHover && totalHours > 0 && (
                <div
                    className={"hoursProgressBarPopover hoursProgressBarTargetPopover"}
                    style={{ left: `${targetPct}%`, transform: "translateX(-50%)" }}
                    role={"dialog"}
                    aria-label={"Target billable hours"}
                >
                    <dl>
                        <dt>Target billable</dt>
                        <dd>{formatHoursForPopover(targetBillableHours)} h</dd>
                    </dl>
                </div>
            )}
        </div>
    );
});
