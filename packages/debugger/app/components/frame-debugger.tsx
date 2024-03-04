import { getFrameHtmlHead, getFrameFlattened } from "frames.js";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import React from "react";
import { FrameState } from "frames.js/render";
import { Table, TableBody, TableCell, TableRow } from "@/components/table";
import {
  ArrowLeft,
  ArrowRight,
  BanIcon,
  HomeIcon,
  ListIcon,
  LoaderIcon,
  RefreshCwIcon,
  RotateCcwIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MockHubConfig } from "./mock-hub-config";
import { MockHubActionContext } from "../utils/mock-hub-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FrameDebuggerFramePropertiesTableRowsProps = {
  stackItem: FrameState["framesStack"][number];
};

function paramsToObject(entries: IterableIterator<[string, string]>): object {
  const result: Record<string, any> = {};
  for (const [key, value] of entries) {
    // each 'entry' is a [key, value] tupple
    if (value.startsWith("{")) {
      try {
        result[key] = JSON.parse(value);
        continue;
      } catch (err) {}
    }
    result[key] = value;
  }
  return result;
}

function FrameDebuggerFramePropertiesTableRow({
  stackItem,
}: FrameDebuggerFramePropertiesTableRowsProps) {
  const properties = useMemo(() => {
    /** tuple of key and value */
    const validProperties: [string, string][] = [];
    /** tuple of key and error message */
    const invalidProperties: [string, string[]][] = [];
    const visitedInvalidProperties: string[] = [];

    if ("requestError" in stackItem) {
      return { validProperties, invalidProperties, isValid: false };
    }

    // we need to check validation errors first because getFrame incorrectly return a value for a key even if it's invalid
    if (stackItem.frameValidationErrors) {
      for (const [key, errors] of Object.entries(
        stackItem.frameValidationErrors
      )) {
        invalidProperties.push([key, errors]);
        visitedInvalidProperties.push(key);
      }
    }

    const flattenedFrame = getFrameFlattened(stackItem.frame);

    for (const [key, value] of Object.entries(flattenedFrame)) {
      // skip if the key is already set as invalid or value is undefined / null
      if (visitedInvalidProperties.includes(key) || value == null) {
        continue;
      }

      validProperties.push([key, value]);
    }

    return {
      validProperties,
      invalidProperties,
      isValid: invalidProperties.length === 0,
    };
  }, [stackItem]);

  return (
    <>
      {properties.validProperties.map(([propertyKey, value]) => {
        return (
          <TableRow key={`${propertyKey}-valid`}>
            <TableCell>🟢</TableCell>
            <TableCell>{propertyKey}</TableCell>
            <TableCell className="text-slate-500">
              <ShortenedText text={value} maxLength={30} />
            </TableCell>
          </TableRow>
        );
      })}
      {properties.invalidProperties.map(([propertyKey, errorMessages]) => {
        return (
          <TableRow key={`${propertyKey}-invalid`}>
            <TableCell>🔴</TableCell>
            <TableCell>{propertyKey}</TableCell>
            <TableCell className="text-slate-500">
              <p className="font-bold text-red-800">
                {errorMessages.join(", ")}
              </p>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

function ShortenedText({
  maxLength,
  text,
}: {
  maxLength: number;
  text: string;
}) {
  if (text.length < maxLength) return text;

  return (
    <HoverCard>
      <HoverCardTrigger>{text.slice(0, maxLength - 3)}...</HoverCardTrigger>
      <HoverCardContent className="break-words">{text}</HoverCardContent>
    </HoverCard>
  );
}

export function FrameDebugger({
  children,
  url,
  frameState,
  mockHubContext,
  setMockHubContext,
}: {
  frameState: FrameState;
  children: React.ReactElement<any>;
  url: string;
  mockHubContext: Partial<MockHubActionContext>;
  setMockHubContext: Dispatch<SetStateAction<Partial<MockHubActionContext>>>;
}) {
  const [copySuccess, setCopySuccess] = useState(false);
  useEffect(() => {
    if (copySuccess) {
      setTimeout(() => {
        setCopySuccess(false);
      }, 1000);
    }
  }, [copySuccess, setCopySuccess]);

  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  useEffect(() => {
    if (!frameState.isLoading) {
      // make sure the first frame is open
      if (
        !openAccordions.includes(
          String(frameState.framesStack[0]?.timestamp.getTime())
        )
      )
        setOpenAccordions((v) => [
          ...v,
          String(frameState.framesStack[0]?.timestamp.getTime()),
        ]);
    }
  }, [frameState.isLoading]);

  return (
    <div className="flex flex-row items-start p-4 gap-4 bg-slate-50 max-w-full w-full h-full">
      <div className="flex flex-col gap-4 w-[300px] min-w-[300px]">
        <div className="flex flex-row gap-2">
          <Button
            className="flex flex-row gap-3 items-center shadow-sm border"
            variant={"outline"}
            disabled={!frameState?.homeframeUrl}
            onClick={() => {
              if (frameState?.homeframeUrl)
                // fetch home frame again
                frameState.fetchFrame({
                  url: frameState?.homeframeUrl,
                  method: "GET",
                  request: {},
                });
            }}
          >
            <HomeIcon size={20} />
          </Button>
          <Button
            className="flex flex-row gap-3 items-center shadow-sm border"
            variant={"outline"}
            disabled={!frameState?.homeframeUrl}
            onClick={() => {
              if (frameState?.homeframeUrl) {
                frameState.clearFrameStack();
                frameState.fetchFrame({
                  url: frameState?.homeframeUrl,
                  method: "GET",
                  request: {},
                });
              }
            }}
          >
            <BanIcon size={20} />
          </Button>
          <Button
            className="flex flex-row gap-3 items-center shadow-sm border"
            variant={"outline"}
            onClick={() => {
              if (frameState?.framesStack[0]?.request) {
                frameState.fetchFrame({
                  url: frameState?.framesStack[0].url,
                  method: frameState?.framesStack[0].method,
                  request: frameState.framesStack[0].request,
                });
              }
            }}
          >
            <RefreshCwIcon size={20} />
          </Button>
        </div>
        <Card className="max-h-[400px] overflow-y-auto">
          <CardContent className="p-0">
            {[
              ...(frameState.isLoading ? [frameState.isLoading] : []),
              ...frameState.framesStack,
            ].map((frameStackItem, i) => {
              return (
                <button
                  className={`px-4 py-3 flex flex-col gap-2 ${i !== 0 ? "border-t" : "bg-slate-50"} hover:bg-slate-50 w-full`}
                  key={frameStackItem.timestamp.getTime()}
                  onClick={() => {
                    frameState.fetchFrame({
                      url: frameStackItem.url,
                      method: frameStackItem.method,
                      request: frameStackItem.request,
                    });
                  }}
                >
                  <span className="flex flex-row w-full">
                    <span className="border text-gray-500 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
                      {frameStackItem.method}
                    </span>
                    <span className="border text-gray-500 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
                      {new URL(frameStackItem.url).protocol}//
                      {new URL(frameStackItem.url).hostname}
                      {new URL(frameStackItem.url).port
                        ? `:${new URL(frameStackItem.url).port}`
                        : ""}
                    </span>
                    <span className="ml-auto">
                      <LoaderIcon className="animate-spin" size={20} />
                      {!("requestError" in frameStackItem) &&
                      frameStackItem.isValid
                        ? "🟢"
                        : "🔴"}
                    </span>
                  </span>
                  <span className="flex flex-row w-full">
                    <span>{new URL(frameStackItem.url).pathname}</span>
                    {Array.from(
                      new URL(frameStackItem.url).searchParams.entries()
                    ).length ? (
                      <HoverCard>
                        <HoverCardTrigger>
                          <span className="border ml-2 text-gray-500 text-xs font-medium me-2 p-1 cursor-pointer rounded dark:bg-gray-700 dark:text-gray-300">
                            ?params
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent>
                          <pre
                            id="json"
                            className="font-mono text-xs"
                            style={{
                              padding: "10px",
                              borderRadius: "4px",
                            }}
                          >
                            {JSON.stringify(
                              paramsToObject(
                                new URL(
                                  frameStackItem.url
                                ).searchParams.entries()
                              ),
                              null,
                              2
                            )}
                          </pre>
                        </HoverCardContent>
                      </HoverCard>
                    ) : null}
                    <span className="ml-auto">
                      {frameStackItem.timestamp.toLocaleTimeString()}
                    </span>
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-5">
            <MockHubConfig
              hubContext={mockHubContext}
              setHubContext={setMockHubContext}
            ></MockHubConfig>
          </CardContent>
        </Card>
        <div className="border rounded-lg shadow-sm bg-white">
          <a
            target="_blank"
            className="px-2 py-3 block"
            href="https://docs.farcaster.xyz/learn/what-is-farcaster/frames"
          >
            <span className="text-slate-400 px-2 w-9 relative text-center inline-block">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="inline mb-1"
                width="18"
                height="18"
                fill="none"
                viewBox="0 0 1000 1000"
              >
                <path
                  fill="#64748b"
                  d="M257.778 155.556h484.444v688.889h-71.111V528.889h-.697c-7.86-87.212-81.156-155.556-170.414-155.556-89.258 0-162.554 68.344-170.414 155.556h-.697v315.556h-71.111V155.556z"
                ></path>
                <path
                  fill="#64748b"
                  d="M128.889 253.333l28.889 97.778h24.444v395.556c-12.273 0-22.222 9.949-22.222 22.222v26.667h-4.444c-12.273 0-22.223 9.949-22.223 22.222v26.667h248.889v-26.667c0-12.273-9.949-22.222-22.222-22.222h-4.444v-26.667c0-12.273-9.95-22.222-22.223-22.222h-26.666V253.333H128.889zM675.556 746.667c-12.273 0-22.223 9.949-22.223 22.222v26.667h-4.444c-12.273 0-22.222 9.949-22.222 22.222v26.667h248.889v-26.667c0-12.273-9.95-22.222-22.223-22.222h-4.444v-26.667c0-12.273-9.949-22.222-22.222-22.222V351.111h24.444L880 253.333H702.222v493.334h-26.666z"
                ></path>
              </svg>
            </span>
            Farcaster Frames Docs
          </a>
          <a
            target="_blank"
            className="px-2 py-3 border-t block"
            href="https://framesjs.org"
          >
            <span className="text-slate-400 px-2 w-9 relative text-center inline-block">
              ↗
            </span>
            Frames.js documentation
          </a>
          <a
            target="_blank"
            className="px-2 py-3 border-t block"
            href="https://warpcast.com/~/developers/embeds"
          >
            <span className="text-slate-400 px-2 w-9 relative text-center inline-block bottom-[1px]">
              ⬗
            </span>
            Warpcast Frame Debugger
          </a>
          <a
            target="_blank"
            className="px-2 py-3 border-t block"
            href="https://github.com/davidfurlong/awesome-frames?tab=readme-ov-file"
          >
            <span className="text-slate-400 px-2 w-9 relative text-center inline-block bottom-[1px]">
              <ListIcon className="inline" size={16} />
            </span>
            Awesome Frames
          </a>
        </div>
      </div>
      <div className="flex flex-col gap-4 w-[500px] min-w-[500px]">
        <div className="w-full flex flex-col gap-1">
          {children}{" "}
          {frameState.isLoading && !frameState.frame ? (
            <div className="flex flex-col space-y-3">
              <Skeleton className="h-[250px] w-full rounded-xl" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}
          <div className="ml-auto text-sm text-slate-500">{url}</div>
        </div>

        {frameState.framesStack.length !== 0 ? (
          <Card>
            <CardContent className="px-5 py-5 w-full overflow-x-auto">
              <Tabs defaultValue="state" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="state">Frame</TabsTrigger>
                  <TabsTrigger value="query">Query params</TabsTrigger>
                  <TabsTrigger value="meta">Meta tags</TabsTrigger>
                </TabsList>
                <TabsContent value="query">
                  {Array.from(
                    new URL(
                      frameState.framesStack[0]!.url
                    ).searchParams.entries()
                  ).length ? (
                    <pre
                      id="json"
                      className="font-mono text-xs"
                      style={{
                        padding: "10px",
                        borderRadius: "4px",
                      }}
                    >
                      {JSON.stringify(
                        paramsToObject(
                          new URL(
                            frameState.framesStack[0]!.url
                          ).searchParams.entries()
                        ),
                        null,
                        2
                      )}
                    </pre>
                  ) : (
                    "None"
                  )}
                </TabsContent>
                <TabsContent value="meta">
                  {"frame" in frameState.framesStack[0]! ? (
                    <div className="py-4 flex-1">
                      <span className="font-bold mr-2">html tags</span>
                      <button
                        className="underline"
                        onClick={() => {
                          // Copy the text inside the text field
                          navigator.clipboard.writeText(
                            getFrameHtmlHead(frameState.framesStack[0]!.frame)
                          );
                          setCopySuccess(true);
                        }}
                      >
                        {copySuccess
                          ? "✔︎ copied to clipboard"
                          : "copy html tags"}
                      </button>
                      <pre
                        id="html"
                        className="text-xs"
                        style={{
                          padding: "10px",
                          borderRadius: "4px",
                        }}
                      >
                        {getFrameHtmlHead(frameState.framesStack[0]!.frame)
                          .split("<meta")
                          .filter((t) => !!t)
                          // hacky...
                          .flatMap((el, i) => [
                            <span key={i}>{`<meta${el}`}</span>,
                            <br key={`br_${i}`} />,
                          ])}
                      </pre>
                    </div>
                  ) : null}
                </TabsContent>
                <TabsContent value="state">
                  <pre id="json" className="font-mono text-xs p-2">
                    {JSON.stringify(
                      "frame" in frameState.framesStack[0]!
                        ? frameState.framesStack[0]!.frame
                        : undefined,
                      null,
                      2
                    )}
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : null}
      </div>
      <div className="flex flex-row gap-4 w-full">
        <div className="h-full min-w-0 w-full">
          <Card>
            <CardContent className="p-0">
              {frameState.isLoading ? (
                <div
                  className="flex flex-row gap-2 p-4"
                  // className={
                  //   "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180"
                  // }
                >
                  <LoaderIcon className="animate-spin" />
                  Fetching frame #{frameState.framesStack.length + 1}...
                </div>
              ) : null}
              {frameState.framesStack.length !== 0 ? (
                <div className="px-2">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          {frameState.framesStack[0]!.speed > 5
                            ? "🔴"
                            : frameState.framesStack[0]!.speed > 4
                              ? "🟠"
                              : "🟢"}
                        </TableCell>
                        <TableCell>frame speed</TableCell>
                        <TableCell className="text-slate-500">
                          {frameState.framesStack[0]!.speed > 5
                            ? `Request took more than 5s (${frameState.framesStack[0]!.speed} seconds). This may be normal: first request will take longer in development (as next.js builds), but in production, clients will timeout requests after 5s`
                            : frameState.framesStack[0]!.speed > 4
                              ? `Warning: Request took more than 4s (${frameState.framesStack[0]!.speed} seconds). Requests will fail at 5s. This may be normal: first request will take longer in development (as next.js builds), but in production, if there's variance here, requests could fail in production if over 5s`
                              : `${frameState.framesStack[0]!.speed} seconds`}
                        </TableCell>
                      </TableRow>
                      <FrameDebuggerFramePropertiesTableRow
                        stackItem={frameState.framesStack[0]!}
                      ></FrameDebuggerFramePropertiesTableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
