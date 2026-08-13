"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/toast-provider";
import {
  AccessibilityOptionsField,
  type AccessibilityOption,
} from "@/components/events/accessibility-options-field";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  EventPosterUploader,
  type EventPosterLabels,
} from "@/components/events/event-poster-uploader";
import {
  EventCompletenessChecklist,
  type EventCompletenessLabels,
} from "@/components/events/event-listing-completeness";
import {
  EVENT_ACCESSIBILITY_MAX_LENGTH,
  EVENT_ELIGIBILITY_MAX_LENGTH,
} from "@/lib/events/event-decision-info";
import {
  EVENT_COST_CURRENCY,
  EVENT_COST_NOTES_MAX_LENGTH,
  EVENT_EXPECTED_COMMITMENT_MAX_LENGTH,
  EVENT_REQUIRED_MATERIALS_MAX_LENGTH,
  type EventCostType,
} from "@/lib/events/event-practical-details";
import {
  EVENT_COMPLETENESS_STEP_BY_ITEM,
  getEventListingCompleteness,
  type EventCompletenessItemId,
} from "@/lib/events/event-listing-completeness";
import {
  EVENT_CANCELLATION_NOTICE_MAX_LENGTH,
} from "@/lib/events/event-cancellation-notice";
import { formatSchedulePreview } from "@/lib/i18n/date-format";
import type { Locale } from "@/lib/i18n/locales";
import { createEvent, type CreateEventState } from "./actions";

type ClubOption = {
  id: string;
  name: string;
};

type CategoryOption = {
  label: string;
  value: string;
};

type StaffOption = {
  id: string;
  label: string;
};

type FormStep = 0 | 1 | 2;
type DurationPreset = "30" | "60" | "90" | "120" | "custom";

type TextPresetOption = {
  id: string;
  label: string;
  requiresDetails?: boolean;
};

type EventFormValues = {
  accessibilityNotes: string;
  category: string;
  clubId: string;
  costAmount: string;
  costNotes: string;
  description: string;
  eligibilityNotes: string;
  experienceLevel: string;
  expectedCommitment: string;
  location: string;
  maxParticipants: string;
  permissionNote: string;
  requiredMaterials: string;
  responsibleStaffId: string;
  cancellationNotice: string;
  title: string;
};

type CreateEventFormLabels = {
  accessibilityGuidance: string;
  accessibilityInformation: string;
  accessibilityPlaceholder: string;
  accessibleWashroom: string;
  allStudents: string;
  back: string;
  basics: string;
  beginnerFriendly: string;
  club: string;
  clubMembers: string;
  commitment: string;
  commitmentPlaceholder: string;
  continue: string;
  cost: string;
  costAmount: string;
  costCurrency: string;
  costFree: string;
  costNotes: string;
  costNotesPlaceholder: string;
  costNotSpecified: string;
  costPaid: string;
  costVariable: string;
  category: string;
  createApproved: string;
  creating: string;
  custom: string;
  dateTime: string;
  dateRequired: string;
  description: string;
  device: string;
  detailsCompleted: string;
  duration30: string;
  duration60: string;
  duration90: string;
  duration120: string;
  endTime: string;
  endTimeRequired: string;
  eventDate: string;
  eventTimePreview: string;
  eligibility: string;
  eligibilityPlaceholder: string;
  experienceLevel: string;
  fullTerm: string;
  goBackAndComplete: string;
  leaderClubRequired: string;
  leaderNeedsClub: string;
  location: string;
  locationRequired: string;
  listingCompleteness: string;
  maxParticipants: string;
  maxParticipantsPositive: string;
  materials: string;
  materialsPlaceholder: string;
  missingInformation: string;
  no: string;
  noCategory: string;
  needsMoreDetails: string;
  notebookAndPen: string;
  notSpecified: string;
  nothingRequired: string;
  oneTime: string;
  paidCostRequired: string;
  participation: string;
  permissionNote: string;
  permissionNotePlaceholder: string;
  permissionRequired: string;
  creatingForSchool: string;
  priorExperienceRecommended: string;
  publishAnyway: string;
  quietEnvironment: string;
  quickDuration: string;
  responsibleAdult: string;
  responsibleAdultHelp: string;
  responsibleAdultReviewHelp: string;
  readyToPublish: string;
  review: string;
  riskHigh: string;
  riskLevel: string;
  riskLow: string;
  riskMedium: string;
  safetyPermissions: string;
  scheduleChangeNotice: string;
  scheduleNoticeGuidance: string;
  scheduleNoticePlaceholder: string;
  schoolWideEvent: string;
  seatingAvailable: string;
  specificGrades: string;
  sportswear: string;
  startTime: string;
  startTimeRequired: string;
  submitForApproval: string;
  submitProposalAnyway: string;
  submitting: string;
  timeOrder: string;
  timePreviewEmpty: string;
  timezoneHelper: string;
  title: string;
  titleRequired: string;
  twiceWeekly: string;
  variableCostNotesRequired: string;
  weekly: string;
  wheelchairAccessibleLocation: string;
  yes: string;
};

const initialState: CreateEventState = {
  message: "",
  success: false,
};

export function CreateEventForm({
  canCreate,
  categories,
  clubs,
  defaultResponsibleStaffId,
  isStaff,
  labels,
  locale,
  platformSchool,
  posterLabels,
  staffOptions,
}: {
  canCreate: boolean;
  categories: CategoryOption[];
  clubs: ClubOption[];
  defaultResponsibleStaffId: string | null;
  isStaff: boolean;
  labels: CreateEventFormLabels;
  locale: Locale;
  platformSchool?: { id: string; name: string } | null;
  posterLabels: EventPosterLabels;
  staffOptions: StaffOption[];
}) {
  const [state, formAction] = useActionState(createEvent, initialState);
  const [currentStep, setCurrentStep] = useState<FormStep>(0);
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  const [durationPreset, setDurationPreset] =
    useState<DurationPreset>("60");
  const [costType, setCostType] = useState<EventCostType | "">("");
  const [permissionRequired, setPermissionRequired] = useState(false);
  const [riskLevel, setRiskLevel] = useState("low");
  const [clientError, setClientError] = useState("");
  const [clientFieldErrors, setClientFieldErrors] = useState<
    Record<string, string>
  >({});
  const [values, setValues] = useState<EventFormValues>(() => ({
    accessibilityNotes: "",
    category: "",
    clubId: isStaff ? "" : clubs[0]?.id ?? "",
    costAmount: "",
    costNotes: "",
    description: "",
    eligibilityNotes: "",
    experienceLevel: "",
    expectedCommitment: "",
    location: "",
    maxParticipants: "",
    permissionNote: "",
    requiredMaterials: "",
    responsibleStaffId: defaultResponsibleStaffId ?? "",
    cancellationNotice: "",
    title: "",
  }));
  const [eligibilityPreset, setEligibilityPreset] = useState("");
  const [materialsPreset, setMaterialsPreset] = useState("");
  const [commitmentPreset, setCommitmentPreset] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const submissionIdRef = useRef<HTMLInputElement>(null);

  const endTime = useMemo(
    () =>
      durationPreset === "custom"
        ? customEndTime
        : durationEndTime(eventDate, startTime, Number(durationPreset)),
    [customEndTime, durationPreset, eventDate, startTime],
  );
  const startsAtValue = eventDate && startTime ? `${eventDate}T${startTime}` : "";
  const endsAtValue = eventDate && endTime ? `${eventDate}T${endTime}` : "";
  const schedulePreview = useMemo(() => {
    if (!eventDate || !startTime || !endTime) return "";

    const startsAt = parseLocalDateTime(eventDate, startTime);
    const endsAt = parseLocalDateTime(eventDate, endTime);

    if (!startsAt || !endsAt || endsAt <= startsAt) return "";
    return formatSchedulePreview(startsAt, endsAt, locale);
  }, [endTime, eventDate, locale, startTime]);

  useEffect(() => {
    const input = submissionIdRef.current;
    if (input && (!input.value || state.eventId)) {
      input.value = crypto.randomUUID();
    }
  }, [state.eventId]);

  useEffect(() => {
    if (state.success || !state.fieldErrors) return;
    const frameId = window.requestAnimationFrame(() => {
      setCurrentStep(stepForFieldErrors(state.fieldErrors ?? {}));
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [state.fieldErrors, state.success]);

  if (!canCreate) {
    return <p className="notice-box">{labels.leaderNeedsClub}</p>;
  }

  const durationOptions: Array<{ id: DurationPreset; label: string }> = [
    { id: "30", label: labels.duration30 },
    { id: "60", label: labels.duration60 },
    { id: "90", label: labels.duration90 },
    { id: "120", label: labels.duration120 },
    { id: "custom", label: labels.custom },
  ];
  const eligibilityOptions: TextPresetOption[] = [
    { id: "all", label: labels.allStudents },
    { id: "club", label: labels.clubMembers },
    { id: "grades", label: labels.specificGrades, requiresDetails: true },
    { id: "custom", label: labels.custom, requiresDetails: true },
  ];
  const materialsOptions: TextPresetOption[] = [
    { id: "nothing", label: labels.nothingRequired },
    { id: "notebook", label: labels.notebookAndPen },
    { id: "sportswear", label: labels.sportswear },
    { id: "device", label: labels.device },
    { id: "custom", label: labels.custom, requiresDetails: true },
  ];
  const commitmentOptions: TextPresetOption[] = [
    { id: "once", label: labels.oneTime },
    { id: "weekly", label: labels.weekly },
    { id: "twice", label: labels.twiceWeekly },
    { id: "term", label: labels.fullTerm },
    { id: "custom", label: labels.custom, requiresDetails: true },
  ];
  const accessibilityOptions: AccessibilityOption[] = [
    { id: "wheelchair", label: labels.wheelchairAccessibleLocation },
    { id: "seating", label: labels.seatingAvailable },
    { id: "washroom", label: labels.accessibleWashroom },
    { id: "quiet", label: labels.quietEnvironment },
  ];

  function updateValue<Key extends keyof EventFormValues>(
    key: Key,
    value: EventFormValues[Key],
    fieldName: string = key,
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    clearFieldError(fieldName);
  }

  function clearFieldError(fieldName: string) {
    setClientFieldErrors((current) => {
      if (!current[fieldName]) return current;
      const next = { ...current };
      delete next[fieldName];
      return next;
    });
    if (clientError) setClientError("");
  }

  function showStep(step: FormStep) {
    setCurrentStep(step);
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function validateStep(step: FormStep) {
    const errors: Record<string, string> = {};

    if (step === 0) {
      if (!values.title.trim()) errors.title = labels.titleRequired;
      if (!values.location.trim()) errors.location = labels.locationRequired;
      const scheduleError = getScheduleError(
        eventDate,
        startTime,
        endTime,
        labels,
      );
      if (scheduleError) errors[scheduleError.field] = scheduleError.text;
    }

    if (step === 1) {
      if (!isStaff && !values.clubId) {
        errors.club_id = labels.leaderClubRequired;
      }
      if (
        values.maxParticipants &&
        (!Number.isInteger(Number(values.maxParticipants)) ||
          Number(values.maxParticipants) <= 0)
      ) {
        errors.max_participants = labels.maxParticipantsPositive;
      }
      if (costType === "paid" && Number(values.costAmount) <= 0) {
        errors.cost_amount = labels.paidCostRequired;
      }
      if (costType === "variable" && !values.costNotes.trim()) {
        errors.cost_notes = labels.variableCostNotesRequired;
      }
    }

    setClientFieldErrors(errors);
    const firstMessage = Object.values(errors)[0] ?? "";
    setClientError(firstMessage);
    return Object.keys(errors).length === 0;
  }

  function continueFromStep() {
    if (!validateStep(currentStep)) return;
    showStep((currentStep + 1) as FormStep);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    for (const step of [0, 1] as const) {
      if (!validateStep(step)) {
        event.preventDefault();
        showStep(step);
        return;
      }
    }
    setClientError("");
  }

  const selectedClub = clubs.find((club) => club.id === values.clubId)?.name;
  const costSummary =
    costType === "free"
      ? labels.costFree
      : costType === "paid"
        ? `${values.costAmount || "-"} ${EVENT_COST_CURRENCY}`
        : costType === "variable"
          ? labels.costVariable
          : labels.costNotSpecified;
  const completeness = getEventListingCompleteness({
    accessibilityNotes: values.accessibilityNotes,
    category: values.category,
    costAmount: values.costAmount,
    costCurrency: costType === "paid" ? EVENT_COST_CURRENCY : null,
    costNotes: values.costNotes,
    costType: costType || null,
    description: values.description,
    eligibilityNotes: values.eligibilityNotes,
    endsAt: endsAtValue,
    experienceLevel: values.experienceLevel,
    expectedCommitment: values.expectedCommitment,
    location: values.location,
    requiredMaterials: values.requiredMaterials,
    responsibleAdultRequired: isStaff,
    responsibleStaffId: values.responsibleStaffId,
    startsAt: startsAtValue,
  });
  const completenessLabels: EventCompletenessLabels = {
    detailsCompleted: labels.detailsCompleted,
    listingCompleteness: labels.listingCompleteness,
    missingInformation: labels.missingInformation,
    needsMoreDetails: labels.needsMoreDetails,
    readyToPublish: labels.readyToPublish,
  };
  const completenessItemLabels: Record<EventCompletenessItemId, string> = {
    accessibility: labels.accessibilityInformation,
    category: labels.category,
    commitment: labels.commitment,
    cost: labels.cost,
    description: labels.description,
    eligibility: labels.eligibility,
    experience: labels.experienceLevel,
    location: labels.location,
    materials: labels.materials,
    responsible_adult: labels.responsibleAdult,
    schedule: labels.dateTime,
  };

  return (
    <form
      action={formAction}
      className="compact-form-xl flex flex-col gap-3"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <input ref={submissionIdRef} name="submission_id" type="hidden" />
      <input name="starts_at" readOnly type="hidden" value={startsAtValue} />
      <input name="ends_at" readOnly type="hidden" value={endsAtValue} />
      <ActionToast message={clientError} success={false} />
      <ActionToast message={state.message} success={state.success} />

      {platformSchool ? (
        <div className="notice-box min-w-0">
          <p className="break-words text-sm font-semibold">
            {labels.creatingForSchool}
          </p>
          <input name="school_id" type="hidden" value={platformSchool.id} />
          <FieldError message={fieldError("school_id")} />
        </div>
      ) : null}

      <ol className="grid grid-cols-3 gap-2" aria-label={labels.review}>
        {[labels.basics, labels.participation, labels.review].map(
          (stepLabel, index) => {
            const active = currentStep === index;
            const complete = currentStep > index;
            return (
              <li
                aria-current={active ? "step" : undefined}
                className={`form-step-indicator motion-choice relative flex min-w-0 items-center gap-2 overflow-hidden rounded-md border px-2 py-2 text-xs font-semibold sm:px-3 sm:text-sm ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-slate-950"
                    : complete
                      ? "border-[var(--border-strong)] bg-[var(--card-soft)] text-slate-800"
                      : "border-[var(--border)] text-slate-500"
                }`}
                data-active={active ? "true" : "false"}
                key={stepLabel}
              >
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${
                    active || complete
                      ? "bg-[var(--accent)] text-slate-950"
                      : "bg-[var(--card-soft)] text-slate-600"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 break-words leading-snug">
                  {stepLabel}
                </span>
              </li>
            );
          },
        )}
      </ol>

      <section
        aria-labelledby="event-create-basics"
        className="local-step-panel"
        hidden={currentStep !== 0}
      >
        <h3 className="section-title" id="event-create-basics">
          {labels.basics}
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800 md:col-span-2">
            {labels.title}
            <input
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              name="title"
              onChange={(event) =>
                updateValue("title", event.target.value, "title")
              }
              required
              value={values.title}
            />
            <FieldError message={fieldError("title")} />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.category}
            <select
              className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
              name="category"
              onChange={(event) =>
                updateValue("category", event.target.value, "category")
              }
              value={values.category}
            >
              <option value="">{labels.noCategory}</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <FieldError message={fieldError("category")} />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.eventDate}
            <input
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              name="event_date"
              onChange={(event) => {
                setEventDate(event.target.value);
                clearFieldError("event_date");
              }}
              required
              type="date"
              value={eventDate}
            />
            <FieldError message={fieldError("event_date")} />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.startTime}
            <input
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              name="start_time"
              onChange={(event) => {
                setStartTime(event.target.value);
                clearFieldError("starts_at");
              }}
              required
              type="time"
              value={startTime}
            />
            <FieldError message={fieldError("starts_at")} />
          </label>
          <fieldset className="min-w-0 md:col-span-2 lg:col-span-1">
            <legend className="text-sm font-semibold text-slate-800">
              {labels.quickDuration}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {durationOptions.map((option) => (
                <PresetButton
                  active={durationPreset === option.id}
                  key={option.id}
                  label={option.label}
                  onClick={() => {
                    setDurationPreset(option.id);
                    clearFieldError("ends_at");
                  }}
                />
              ))}
            </div>
          </fieldset>
          {durationPreset === "custom" ? (
            <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
              {labels.endTime}
              <input
                className="h-11 rounded-md border px-3 text-base outline-none transition"
                name="end_time"
                onChange={(event) => {
                  setCustomEndTime(event.target.value);
                  clearFieldError("ends_at");
                }}
                required
                type="time"
                value={customEndTime}
              />
              <FieldError message={fieldError("ends_at")} />
            </label>
          ) : null}
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.location}
            <input
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              name="location"
              onChange={(event) =>
                updateValue("location", event.target.value, "location")
              }
              required
              value={values.location}
            />
            <FieldError message={fieldError("location")} />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800 md:col-span-2 lg:col-span-3">
            {labels.description}
            <textarea
              className="min-h-20 rounded-md border px-3 py-2 text-base outline-none transition"
              name="description"
              onChange={(event) =>
                updateValue("description", event.target.value)
              }
              value={values.description}
            />
          </label>
        </div>
        <SchedulePreview
          labels={labels}
          schedulePreview={schedulePreview}
        />
      </section>

      <section
        aria-labelledby="event-create-participation"
        className="local-step-panel"
        hidden={currentStep !== 1}
      >
        <h3 className="section-title" id="event-create-participation">
          {labels.participation}
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800 lg:col-span-1">
            {labels.club}
            <select
              className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
              name="club_id"
              onChange={(event) =>
                updateValue("clubId", event.target.value, "club_id")
              }
              required={!isStaff}
              value={values.clubId}
            >
              {isStaff ? <option value="">{labels.schoolWideEvent}</option> : null}
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
            <FieldError message={fieldError("club_id")} />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.maxParticipants}
            <input
              className="h-11 rounded-md border px-3 text-base outline-none transition"
              min={1}
              name="max_participants"
              onChange={(event) =>
                updateValue(
                  "maxParticipants",
                  event.target.value,
                  "max_participants",
                )
              }
              type="number"
              value={values.maxParticipants}
            />
            <FieldError message={fieldError("max_participants")} />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
            {labels.experienceLevel}
            <select
              className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
              name="experience_level"
              onChange={(event) =>
                updateValue(
                  "experienceLevel",
                  event.target.value,
                  "experience_level",
                )
              }
              value={values.experienceLevel}
            >
              <option value="">{labels.notSpecified}</option>
              <option value="beginner_friendly">{labels.beginnerFriendly}</option>
              <option value="prior_experience_recommended">
                {labels.priorExperienceRecommended}
              </option>
            </select>
            <FieldError message={fieldError("experience_level")} />
          </label>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <PresetTextArea
            error={fieldError("eligibility_notes")}
            label={labels.eligibility}
            maxLength={EVENT_ELIGIBILITY_MAX_LENGTH}
            name="eligibility_notes"
            onPresetChange={setEligibilityPreset}
            onValueChange={(value) =>
              updateValue("eligibilityNotes", value, "eligibility_notes")
            }
            options={eligibilityOptions}
            placeholder={labels.eligibilityPlaceholder}
            preset={eligibilityPreset}
            value={values.eligibilityNotes}
          />
          <fieldset className="form-group min-w-0">
            <legend className="form-group-title">{labels.cost}</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
                {labels.cost}
                <select
                  className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
                  name="cost_type"
                  onChange={(event) => {
                    setCostType(event.target.value as EventCostType | "");
                    clearFieldError("cost_type");
                  }}
                  value={costType}
                >
                  <option value="">{labels.costNotSpecified}</option>
                  <option value="free">{labels.costFree}</option>
                  <option value="paid">{labels.costPaid}</option>
                  <option value="variable">{labels.costVariable}</option>
                </select>
                <FieldError message={fieldError("cost_type")} />
              </label>
              {costType === "paid" ? (
                <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
                  <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
                    {labels.costAmount}
                    <input
                      className="h-11 min-w-0 rounded-md border px-3 text-base outline-none transition"
                      inputMode="decimal"
                      min="0.01"
                      name="cost_amount"
                      onChange={(event) =>
                        updateValue(
                          "costAmount",
                          event.target.value,
                          "cost_amount",
                        )
                      }
                      required
                      step="0.01"
                      type="number"
                      value={values.costAmount}
                    />
                    <FieldError message={fieldError("cost_amount")} />
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
                    {labels.costCurrency}
                    <select
                      className="h-11 rounded-md border bg-white px-2 text-base"
                      defaultValue={EVENT_COST_CURRENCY}
                      name="cost_currency"
                    >
                      <option value={EVENT_COST_CURRENCY}>
                        {EVENT_COST_CURRENCY}
                      </option>
                    </select>
                  </label>
                </div>
              ) : null}
              {costType ? (
                <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
                  {labels.costNotes}
                  <textarea
                    className="min-h-20 rounded-md border px-3 py-2 text-base outline-none transition"
                    maxLength={EVENT_COST_NOTES_MAX_LENGTH}
                    name="cost_notes"
                    onChange={(event) =>
                      updateValue("costNotes", event.target.value, "cost_notes")
                    }
                    placeholder={labels.costNotesPlaceholder}
                    required={costType === "variable"}
                    value={values.costNotes}
                  />
                  <FieldError message={fieldError("cost_notes")} />
                </label>
              ) : null}
            </div>
          </fieldset>
          <PresetTextArea
            error={fieldError("required_materials")}
            label={labels.materials}
            maxLength={EVENT_REQUIRED_MATERIALS_MAX_LENGTH}
            name="required_materials"
            onPresetChange={setMaterialsPreset}
            onValueChange={(value) =>
              updateValue("requiredMaterials", value, "required_materials")
            }
            options={materialsOptions}
            placeholder={labels.materialsPlaceholder}
            preset={materialsPreset}
            value={values.requiredMaterials}
          />
          <PresetTextArea
            error={fieldError("expected_commitment")}
            label={labels.commitment}
            maxLength={EVENT_EXPECTED_COMMITMENT_MAX_LENGTH}
            name="expected_commitment"
            onPresetChange={setCommitmentPreset}
            onValueChange={(value) =>
              updateValue(
                "expectedCommitment",
                value,
                "expected_commitment",
              )
            }
            options={commitmentOptions}
            placeholder={labels.commitmentPlaceholder}
            preset={commitmentPreset}
            value={values.expectedCommitment}
          />
          <div className="lg:col-span-2">
            <AccessibilityOptionsField
              customLabel={labels.custom}
              description={labels.accessibilityGuidance}
              error={fieldError("accessibility_notes")}
              initialValue={values.accessibilityNotes}
              label={labels.accessibilityInformation}
              maxLength={EVENT_ACCESSIBILITY_MAX_LENGTH}
              name="accessibility_notes"
              onValueChange={(value) =>
                updateValue(
                  "accessibilityNotes",
                  value,
                  "accessibility_notes",
                )
              }
              notSpecifiedLabel={labels.notSpecified}
              options={accessibilityOptions}
              placeholder={labels.accessibilityPlaceholder}
            />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="event-create-review"
        className="local-step-panel"
        hidden={currentStep !== 2}
      >
        <h3 className="section-title" id="event-create-review">
          {labels.review}
        </h3>
        <div className="mt-3">
          <EventCompletenessChecklist
            itemLabels={completenessItemLabels}
            labels={completenessLabels}
            live
            onSelectMissingItem={(item) =>
              showStep(EVENT_COMPLETENESS_STEP_BY_ITEM[item])
            }
            result={completeness}
          />
        </div>
        <div className="mt-3">
          <EventPosterUploader
            currentPosterUrl={null}
            deferUntilEventCreated
            eventId={state.eventId ?? null}
            eventTitle={values.title || labels.title}
            labels={posterLabels}
          />
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <fieldset className="form-group min-w-0">
            <legend className="form-group-title">
              {labels.safetyPermissions}
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {isStaff ? (
                <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
                  {labels.responsibleAdult}
                  <select
                    className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
                    name="responsible_staff_id"
                    onChange={(event) =>
                      updateValue(
                        "responsibleStaffId",
                        event.target.value,
                        "responsible_staff_id",
                      )
                    }
                    value={values.responsibleStaffId}
                  >
                    <option value="">{labels.notSpecified}</option>
                    {staffOptions.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.label}
                      </option>
                    ))}
                  </select>
                  <FieldError message={fieldError("responsible_staff_id")} />
                  <span className="text-xs font-normal leading-5 text-slate-600">
                    {labels.responsibleAdultHelp}
                  </span>
                </label>
              ) : (
                <div className="notice-box sm:col-span-2">
                  <p className="font-semibold">{labels.responsibleAdult}</p>
                  <p className="mt-1 text-xs leading-5">
                    {labels.responsibleAdultReviewHelp}
                  </p>
                </div>
              )}
              <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
                {labels.riskLevel}
                <select
                  className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
                  name="risk_level"
                  onChange={(event) => setRiskLevel(event.target.value)}
                  value={riskLevel}
                >
                  <option value="low">{labels.riskLow}</option>
                  <option value="medium">{labels.riskMedium}</option>
                  <option value="high">{labels.riskHigh}</option>
                </select>
                <FieldError message={fieldError("risk_level")} />
              </label>
              <label className="flex min-h-11 items-center gap-2 self-end text-sm font-semibold text-slate-800">
                <input
                  checked={permissionRequired}
                  className="h-4 w-4 cursor-pointer"
                  name="permission_required"
                  onChange={(event) =>
                    setPermissionRequired(event.target.checked)
                  }
                  type="checkbox"
                  value="true"
                />
                <span className="break-words">{labels.permissionRequired}</span>
              </label>
              {permissionRequired ? (
                <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
                  {labels.permissionNote}
                  <textarea
                    className="min-h-20 rounded-md border px-3 py-2 text-base outline-none transition"
                    name="permission_note"
                    onChange={(event) =>
                      updateValue("permissionNote", event.target.value)
                    }
                    placeholder={labels.permissionNotePlaceholder}
                    value={values.permissionNote}
                  />
                </label>
              ) : null}
            </div>
          </fieldset>

          <fieldset className="form-group min-w-0">
            <legend className="form-group-title">{labels.review}</legend>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <SummaryItem label={labels.title} value={values.title || "-"} />
              <SummaryItem
                label={labels.category}
                value={
                  categories.find((item) => item.value === values.category)
                    ?.label ?? labels.noCategory
                }
              />
              <SummaryItem
                label={labels.eventDate}
                value={schedulePreview || labels.timePreviewEmpty}
              />
              <SummaryItem
                label={labels.location}
                value={values.location || "-"}
              />
              <SummaryItem
                label={labels.club}
                value={selectedClub ?? labels.schoolWideEvent}
              />
              <SummaryItem
                label={labels.maxParticipants}
                value={values.maxParticipants || labels.notSpecified}
              />
              <SummaryItem label={labels.cost} value={costSummary} />
              <SummaryItem
                label={labels.permissionRequired}
                value={permissionRequired ? labels.yes : labels.no}
              />
            </dl>
          </fieldset>

          {isStaff ? (
            <fieldset className="form-group min-w-0 lg:col-span-2">
              <legend className="form-group-title">
                {labels.scheduleChangeNotice}
              </legend>
              <div className="mt-3 grid gap-3">
                <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
                  {labels.scheduleChangeNotice}
                  <textarea
                    className="min-h-20 rounded-md border px-3 py-2 text-base outline-none transition"
                    maxLength={EVENT_CANCELLATION_NOTICE_MAX_LENGTH}
                    name="cancellation_notice"
                    onChange={(event) =>
                      updateValue(
                        "cancellationNotice",
                        event.target.value,
                        "cancellation_notice",
                      )
                    }
                    placeholder={labels.scheduleNoticePlaceholder}
                    value={values.cancellationNotice}
                  />
                  <FieldError message={fieldError("cancellation_notice")} />
                  <span className="text-xs font-normal leading-5 text-slate-600">
                    {labels.scheduleNoticeGuidance}
                  </span>
                </label>
              </div>
            </fieldset>
          ) : null}
        </div>
      </section>

      {clientError ? (
        <p className="notice-box notice-danger" role="alert">
          {clientError}
        </p>
      ) : null}
      {state.message ? (
        <p
          className={
            state.success
              ? "notice-box notice-success"
              : "notice-box notice-danger"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
        {currentStep > 0 ? (
          <button
            className="btn btn-secondary w-full sm:w-auto"
            onClick={() => showStep((currentStep - 1) as FormStep)}
            type="button"
          >
            {labels.back}
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        {currentStep < 2 ? (
          <button
            className="btn btn-primary w-full sm:w-auto"
            onClick={continueFromStep}
            type="button"
          >
            {labels.continue}
          </button>
        ) : (
          <SubmitButton
            completeness={completeness}
            itemLabels={completenessItemLabels}
            isStaff={isStaff}
            labels={labels}
          />
        )}
      </div>
    </form>
  );

  function fieldError(fieldName: string) {
    return clientFieldErrors[fieldName] ?? state.fieldErrors?.[fieldName];
  }
}

function PresetTextArea({
  description,
  error,
  label,
  maxLength,
  name,
  onPresetChange,
  onValueChange,
  options,
  placeholder,
  preset,
  value,
}: {
  description?: string;
  error?: string;
  label: string;
  maxLength: number;
  name: string;
  onPresetChange: (value: string) => void;
  onValueChange: (value: string) => void;
  options: TextPresetOption[];
  placeholder: string;
  preset: string;
  value: string;
}) {
  const selectedOption = options.find((option) => option.id === preset);
  const showDetails = Boolean(selectedOption?.requiresDetails);

  return (
    <fieldset className="form-group min-w-0">
      <legend className="form-group-title">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <PresetButton
            active={preset === option.id}
            key={option.id}
            label={option.label}
            onClick={() => {
              onPresetChange(option.id);
              onValueChange(option.id === "custom" ? "" : option.label);
            }}
          />
        ))}
      </div>
      {showDetails ? (
        <textarea
          className="mt-3 min-h-20 w-full rounded-md border px-3 py-2 text-base outline-none transition"
          maxLength={maxLength}
          name={name}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      ) : (
        <input name={name} type="hidden" value={value} />
      )}
      <FieldError message={error} />
      {description ? (
        <p className="mt-2 break-words text-xs leading-5 text-slate-600">
          {description}
        </p>
      ) : null}
    </fieldset>
  );
}

function PresetButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`btn min-h-10 max-w-full whitespace-normal px-3 text-left text-sm leading-snug ${
        active ? "btn-primary" : "btn-secondary"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function SchedulePreview({
  labels,
  schedulePreview,
}: {
  labels: CreateEventFormLabels;
  schedulePreview: string;
}) {
  return (
    <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--card-soft)] p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">
        {labels.eventTimePreview}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {schedulePreview || labels.timePreviewEmpty}
      </p>
      <p className="mt-1 text-xs text-slate-600">{labels.timezoneHelper}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-[var(--card-soft)] p-3">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <span className="mt-1 block break-words text-xs font-medium text-red-600" role="alert">
      {message}
    </span>
  ) : null;
}

function SubmitButton({
  completeness,
  itemLabels,
  isStaff,
  labels,
}: {
  completeness: ReturnType<typeof getEventListingCompleteness>;
  itemLabels: Record<EventCompletenessItemId, string>;
  isStaff: boolean;
  labels: CreateEventFormLabels;
}) {
  const { pending } = useFormStatus();
  const isIncomplete = completeness.status === "needs_details";
  const warningDescription = `${completeness.completedCount}/${completeness.applicableCount} ${labels.detailsCompleted}. ${labels.missingInformation}: ${completeness.missingItems.map((item) => itemLabels[item]).join(", ")}`;

  if (isStaff && isIncomplete) {
    return (
      <ConfirmSubmitButton
        cancelLabel={labels.goBackAndComplete}
        className="btn btn-primary h-11 w-full sm:w-auto"
        confirmDescription={warningDescription}
        confirmLabel={labels.publishAnyway}
        confirmTitle={labels.needsMoreDetails}
        pendingLabel={labels.creating}
      >
        {labels.publishAnyway}
      </ConfirmSubmitButton>
    );
  }

  return (
    <button
      className="btn btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      {pending
        ? isStaff
          ? labels.creating
          : labels.submitting
        : isStaff
          ? labels.createApproved
          : isIncomplete
            ? labels.submitProposalAnyway
            : labels.submitForApproval}
    </button>
  );
}

function getScheduleError(
  eventDate: string,
  startTime: string,
  endTime: string,
  labels: CreateEventFormLabels,
) {
  if (!eventDate) return { field: "event_date", text: labels.dateRequired };
  if (!startTime) return { field: "starts_at", text: labels.startTimeRequired };
  if (!endTime) return { field: "ends_at", text: labels.endTimeRequired };

  const startsAt = parseLocalDateTime(eventDate, startTime);
  const endsAt = parseLocalDateTime(eventDate, endTime);

  if (!startsAt || !endsAt || endsAt <= startsAt) {
    return { field: "ends_at", text: labels.timeOrder };
  }

  return null;
}

function durationEndTime(
  eventDate: string,
  startTime: string,
  durationMinutes: number,
) {
  const startsAt = parseLocalDateTime(eventDate, startTime);
  if (!startsAt || !Number.isFinite(durationMinutes)) return "";
  return formatTimeInputValue(
    new Date(startsAt.getTime() + durationMinutes * 60 * 1000),
  );
}

function stepForFieldErrors(fieldErrors: Record<string, string>): FormStep {
  const basics = new Set([
    "title",
    "category",
    "location",
    "starts_at",
    "ends_at",
  ]);
  const participation = new Set([
    "club_id",
    "max_participants",
    "experience_level",
    "eligibility_notes",
    "accessibility_notes",
    "cost_type",
    "cost_amount",
    "cost_currency",
    "cost_notes",
    "required_materials",
    "expected_commitment",
  ]);

  if (Object.keys(fieldErrors).some((field) => basics.has(field))) return 0;
  if (Object.keys(fieldErrors).some((field) => participation.has(field))) return 1;
  return 2;
}

function parseLocalDateTime(dateValue: string, timeValue: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateValue) ||
    !/^\d{2}:\d{2}$/.test(timeValue)
  ) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day, hour, minute);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
}

function formatTimeInputValue(date: Date) {
  return `${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
}

function padTimePart(value: number) {
  return String(value).padStart(2, "0");
}
