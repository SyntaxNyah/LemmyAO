// The chatbox styles in public/styles/chatbox and the viewport code target these ids.
export const VIEWPORT_HTML = `
<audio id="client_sfxaudio" data-action="opusCheck" data-event="error"></audio>
<audio id="client_shoutaudio" data-action="opusCheck" data-event="error"></audio>
<audio id="client_testimonyaudio" data-action="opusCheck" data-event="error"></audio>
<div id="client_background">
  <div id="client_gamewindow">
    <div id="client_fullview">
      <img id="client_court" />
      <div id="client_stitch_court">
        <img id="client_court_def" data-action="imgError" data-event="error" />
        <img id="client_court_deft" data-action="imgError" data-event="error" />
        <img id="client_court_wit" data-action="imgError" data-event="error" />
        <img id="client_court_prot" data-action="imgError" data-event="error" />
        <img id="client_court_pro" data-action="imgError" data-event="error" />
      </div>
      <div
        id="client_def_pair_char"
        class="client_char"
        alt="Paired character"
      >
        <img id="client_def_pair_img" data-action="charError" data-event="error" />
      </div>
      <div id="client_def_char" class="client_char" alt="Character">
        <img id="client_def_char_img" data-action="charError" data-event="error" />
      </div>
      <div
        id="client_wit_pair_char"
        class="client_char"
        alt="Paired character"
      >
        <img id="client_wit_pair_img" data-action="charError" data-event="error" />
      </div>
      <div id="client_wit_char" class="client_char" alt="Character">
        <img id="client_wit_char_img" data-action="charError" data-event="error" />
      </div>
      <div
        id="client_pro_pair_char"
        class="client_char"
        alt="Paired character"
      >
        <img id="client_pro_pair_img" data-action="charError" data-event="error" />
      </div>
      <div id="client_pro_char" class="client_char" alt="Character">
        <img id="client_pro_char_img" data-action="charError" data-event="error" />
      </div>
      <img id="client_def_bench" class="client_bench" />
      <img id="client_wit_bench" class="client_bench" />
      <img id="client_pro_bench" class="client_bench" />
    </div>
    <div id="client_classicview">
      <img id="client_court_classic" data-action="imgError" data-event="error" />
      <div
        id="client_pair_char"
        class="client_char"
        alt="Paired character"
      >
        <img id="client_pair_img" data-action="charError" data-event="error" />
      </div>
      <div id="client_char" class="client_char" alt="Character">
        <img id="client_char_img" data-action="charError" data-event="error" />
      </div>
      <img id="client_bench_classic" class="client_bench" />
    </div>
    <div
      id="client_fg"
      alt="Various overlay"
      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    ></div>
    <img
      id="client_evi"
      src=""
      alt="Character Evidence"
      data-action="imgError" data-event="error"
    />
    <img
      id="client_testimony"
      alt="Testimony overlay"
      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
      data-action="imgError" data-event="error"
    />
    <img
      id="client_shout"
      alt="Shout overlay"
      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    />
    <div id="client_chatcontainer" style="font-size: 12px; opacity: 0">
      <div id="client_chatdecoration"></div>
      <div id="client_name">
        <p id="client_inner_name"></p>
      </div>
      <div id="client_chat">
        <p id="client_inner_chat"></p>
        <div id="client_chatwaiting">&#9658;</div>
      </div>
    </div>
    <div id="client_trackstatus">
      <marquee id="client_trackstatustext">None</marquee>
    </div>
    <div id="client_clock">
      <p id="client_clock_date"></p>
      <p id="client_clock_time"></p>
      <p id="client_clock_month"></p>
      <p id="client_clock_weekday"></p>
    </div>
  </div>
</div>
`;
