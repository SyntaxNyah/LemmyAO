import { GoldenLayout, type LayoutConfig } from "golden-layout";

const config = {
  settings: {
    showPopoutIcon: false,
    showCloseIcon: false,
  },
  dimensions: {
    minItemHeight: 40,
  },
  content: [
    {
      type: "row",
      content: [
        {
          type: "column",
          width: 40,
          content: [
            {
              type: "component",
              height: 80,
              isClosable: false,
              componentName: "template",
              title: "IC",
              componentState: { id: "client_wrapper" },
            },
            {
              type: "component",
              height: 20,
              isClosable: false,
              title: "IC Options",
              componentName: "template",
              componentState: { id: "icoptions" },
            },
          ],
        },
        {
          type: "column",
          content: [
            {
              type: "row",
              height: 65,
              content: [
                {
                  type: "stack",
                  content: [
                    {
                      type: "component",
                      isClosable: false,
                      title: "Main",
                      componentName: "template",
                      componentState: { id: "mainmenu" },
                    },
                    {
                      type: "component",
                      isClosable: false,
                      title: "Log",
                      componentName: "template",
                      componentState: { id: "log" },
                    },
                  ],
                },
                {
                  type: "stack",
                  width: 30,
                  content: [
                    {
                      type: "component",
                      isClosable: false,
                      title: "Music",
                      componentName: "template",
                      componentState: { id: "music" },
                    },
                    {
                      type: "component",
                      isClosable: true,
                      title: "Players",
                      componentName: "template",
                      componentState: { id: "players" },
                    },
                  ],
                },
              ],
            },
            {
              type: "row",
              content: [
                {
                  type: "component",
                  title: "OOC",
                  componentName: "template",
                  componentState: { id: "ooc" },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const configMobile = {
  settings: {
    showPopoutIcon: false,
    showCloseIcon: false,
  },
  dimensions: {
    minItemHeight: 40,
  },
  content: [
    {
      type: "row",
      content: [
        {
          type: "column",
          content: [
            {
              type: "component",
              isClosable: false,
              reorderEnabled: false,
              componentName: "template",
              title: "IC",
              componentState: { id: "client_wrapper" },
              height: 56, // Adjust the height proportion as needed
            },
            {
              type: "stack",
              height: 44,
              content: [
                {
                  type: "component",
                  isClosable: false,
                  reorderEnabled: false,
                  title: "IC Options",
                  componentName: "template",
                  componentState: { id: "icoptions" },
                },
                {
                  type: "component",
                  isClosable: false,
                  reorderEnabled: false,
                  title: "Main",
                  componentName: "template",
                  componentState: { id: "mainmenu" },
                },
                {
                  type: "component",
                  isClosable: false,
                  reorderEnabled: false,
                  title: "Log",
                  componentName: "template",
                  componentState: { id: "log" },
                },
                {
                  type: "component",
                  isClosable: false,
                  reorderEnabled: false,
                  title: "Music",
                  componentName: "template",
                  componentState: { id: "music" },
                },
                {
                  type: "component",
                  isClosable: true,
                  title: "Players",
                  componentName: "template",
                  componentState: { id: "players" },
                },
                {
                  type: "component",
                  isClosable: false,
                  reorderEnabled: false,
                  title: "OOC",
                  componentName: "template",
                  componentState: { id: "ooc" },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const isMobileDevice = window.innerWidth <= window.innerHeight;

const golden: any = new GoldenLayout();
golden.registerComponentFactoryFunction(
  "template",
  (container: any, componentState: { id: string }) => {
    const template = document.querySelector(`#${componentState.id}`);
    if (template) container.element.innerHTML = template.innerHTML;
  },
);
if (isMobileDevice) {
  golden.loadLayout(configMobile as LayoutConfig);
} else {
  golden.loadLayout(config as LayoutConfig);
  // Tag the pane sitting under the IC pane so its tab strip can take the panel
  // colour instead of showing the black layout backdrop through.
  golden.root.contentItems[0].contentItems[0].contentItems[1].element.classList.add(
    "client_icoptions_stack",
  );
}

/**
 * Height of the chrome GoldenLayout wraps around a pane's content: its tab
 * header plus the 1px border `.lm_content` draws top and bottom.
 */
function paneChrome(stackElement: HTMLElement): { header: number; border: number } {
  const header = stackElement.children[0] as HTMLElement | undefined;
  const content = stackElement.querySelector('.lm_content') as HTMLElement | null;
  return {
    header: header ? header.offsetHeight : 0,
    border: content ? content.offsetHeight - content.clientHeight : 0,
  };
}

/** Stretch a pane's content boxes over everything below its tab header. */
function fillPaneBelowHeader(stackElement: HTMLElement, headerHeight: number): void {
  const items = stackElement.children[1] as HTMLElement;
  items.style.height = `calc(100% - ${headerHeight}px)`;
  (items.children[0] as HTMLElement).style.height = `100%`;
  (items.children[0].children[0] as HTMLElement).style.height = `100%`;
}

function adjustSplitter(): void {
  if (isMobileDevice) return;
  const column: any = golden.root.contentItems[0].contentItems[0];
  const icItem: any = column.contentItems[0];
  const icOptionsItem: any = column.contentItems[1];
  const columnHeight = column.element.clientHeight;
  if (columnHeight === 0) return;

  const paneWidth = icItem.element.clientWidth;
  const gamewindowHeight = 0.75 * paneWidth; // #client_gamewindow is padding-bottom: 75%
  const inputEl = document.getElementById('client_inputbox');
  const barsEl = document.getElementById('client_bars');
  // Theme stylesheets land after the layout does, so a 0 here means "not styled
  // yet" rather than "needs no room"; the observer below re-fits once they load.
  const inputHeight = inputEl?.offsetHeight || 30;
  const barsHeight = barsEl?.offsetHeight || 20;
  const { header: headerHeight, border: borderHeight } = paneChrome(icItem.element);
  // The game window is aspect-locked, so the pane gets exactly its content plus
  // its own chrome. Slack here would sit under the health bars as a dead strip
  // of pane background above the IC Options tab.
  const totalHeight = Math.ceil(
    gamewindowHeight + inputHeight + barsHeight + headerHeight + borderHeight,
  );

  icItem.element.style.height = `${totalHeight}px`;
  fillPaneBelowHeader(icItem.element, headerHeight);

  // Collapse the splitter between the two panes so the IC Options tab sits flush
  // against the health bars. Dragging it never held anyway — this function
  // reasserts both heights on every resize.
  const splitter = icItem.element.nextElementSibling as HTMLElement | null;
  if (splitter?.classList.contains('lm_splitter')) {
    splitter.style.height = `0px`;
    const dragHandle = splitter.firstElementChild as HTMLElement | null;
    if (dragHandle) dragHandle.style.height = `0px`;
  }

  icOptionsItem.element.style.height = `calc(100% - ${totalHeight}px)`;
  fillPaneBelowHeader(icOptionsItem.element, paneChrome(icOptionsItem.element).header);
}

window.addEventListener('resize', () => setTimeout(adjustSplitter, 100));
setTimeout(adjustSplitter, 100); // Initial call

// Also adjust on item resize
golden.root.contentItems[0].contentItems[0].contentItems[0].on("resize", () => setTimeout(adjustSplitter, 50));

// The IC content changes height on its own when a theme stylesheet or font
// finishes loading, which is what gives the health bars their height.
const icWrapper = document.getElementById('client_icwrapper');
if (icWrapper && typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => adjustSplitter()).observe(icWrapper);
}
