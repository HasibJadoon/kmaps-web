import {
  Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { StudioApiService } from '../../studio-api.service';
import { EpisodeAggregate, LiveCursor, RosterEntry } from '../../studio.models';

const LOBBY: LiveCursor = { section: -1, point: -1 };

/** A message broadcast by the EpisodeSession Durable Object. */
interface LiveMessage {
  t: string;
  role?: 'host' | 'viewer';
  episode?: EpisodeAggregate;
  cursor?: LiveCursor;
  paused?: boolean;
  viewers?: number;
  roster?: RosterEntry[];
  you?: RosterEntry;
  /** Every card played this session. It rides on sync AND on every cursor
   *  change rather than being tracked locally, so two screens that saw
   *  different subsets cannot disagree about which cards are spent. */
  played?: string[];
}

/** One card in the live deck — a flattened talking point. */
interface DeckCard {
  id: string;
  index: number;
  section: string;
  text: string;
  bridge: string | null;
  speakerName: string | null;
  speakerColor: string | null;
  speakerRef: string | null;
  /** The beats you say while holding the card — one turn to speak, so they are
   *  on the card rather than being cards of their own. */
  subs: string[];
}

/** Someone else at the table: their colour, and how much they still hold. */
interface Seat {
  ref: string;
  name: string;
  color: string;
  remaining: number;
  speaking: boolean;
  /** Capped for drawing; the number underneath carries the rest. */
  pips: number[];
}

/** Sub-points arrive as an array or as the JSON text of one, depending on
 *  whether they came from a PATCH or straight out of the column. */
function subsOf(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string');
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [raw];
    } catch { return [raw]; }
  }
  return [];
}

@Component({
  selector: 'km-studio-live-deck',
  standalone: true,
  imports: [],
  template: `
    <div class="deck">
      <div class="deck-top">
        <button type="button" class="deck-x" (click)="leave()" aria-label="Leave">✕</button>
        <div class="deck-title">{{ episodeTitle() || 'Live session' }}</div>
        <div class="deck-viewers">👁 {{ viewers() }}</div>
      </div>

      @if (loading()) {
        <div class="deck-center">Joining session…</div>
      } @else if (error()) {
        <div class="deck-center">
          <div class="deck-bigicon">⚠</div>
          <p>{{ error() }}</p>
          <button type="button" class="deck-btn" (click)="leave()">Back to Studio</button>
        </div>
      } @else if (ended()) {
        <div class="deck-center">
          <div class="deck-bigicon">✓</div>
          <p>This session has ended.</p>
          <div class="deck-center-actions">
            @if (sessionId()) {
              <button type="button" class="deck-btn deck-btn--gold" (click)="viewRecap()">
                View recap
              </button>
            }
            <button type="button" class="deck-btn" (click)="leave()">Back to Studio</button>
          </div>
        </div>
      } @else if (inLobby()) {
        <div class="deck-stage">
          <div class="deck-lobby">
            <div class="deck-roomcode">{{ code }}</div>
            <h1>{{ episodeTitle() }}</h1>
            <p>{{ isHost()
              ? 'Press Start when everyone has joined.'
              : 'Waiting for the host to start…' }}</p>

            @if (namedRoster().length) {
              <div class="deck-roster">
                @for (r of namedRoster(); track $index) {
                  <span class="deck-rosterchip" [style.borderColor]="r.color || '#c9a84c'">
                    <span class="deck-rosterdot"
                          [style.background]="r.color || '#c9a84c'"></span>
                    {{ r.name }}
                    @if (r.role === 'host') { <span class="deck-rosterrole">host</span> }
                  </span>
                }
              </div>
            }
            @if (guestCount() > 0) {
              <p class="deck-guests">
                + {{ guestCount() }} {{ guestCount() === 1 ? 'guest' : 'guests' }} watching
              </p>
            }
            @if (you(); as me) {
              <p class="deck-youare">
                {{ me.name ? "You're in as " + me.name : "You're watching as a guest" }}
              </p>
            }
            @if (!connected()) { <p class="deck-recon">Reconnecting…</p> }
          </div>
        </div>

        @if (isHost()) {
          <div class="deck-foot">
            <button type="button" class="deck-btn deck-btn--gold deck-start"
                    (click)="next()" [disabled]="!connected()">
              Start episode
            </button>
          </div>
        } @else {
          <div class="deck-foot deck-foot--viewer">
            {{ connected() ? 'Waiting for the host to start…' : 'Reconnecting…' }}
          </div>
        }
      } @else {
        <div class="deck-switch">
          <button type="button" [class.on]="view() === 'table'"
                  (click)="view.set('table')">Table</button>
          <button type="button" [class.on]="view() === 'order'"
                  (click)="view.set('order')">Running order</button>
        </div>

        @if (view() === 'table') {
          <div class="tbl">
            <!-- Everyone else, with what they still hold face down beside them.
                 The thickness IS the information: you can see across a table
                 who has a lot left to get through. -->
            @if (seats().length) {
              <div class="tbl-seats">
                @for (seat of seats(); track seat.ref) {
                  <div class="tbl-seat" [class.tbl-seat--on]="seat.speaking"
                       [style.--seat]="seat.color">
                    <div class="tbl-backs">
                      @for (pip of seat.pips; track pip) {
                        <span class="tbl-back"
                              [style.transform]="'rotate(' + backAngle(seat.pips.length, pip)
                                + 'deg) translateX(' + backShift(seat.pips.length, pip) + 'px)'">
                        </span>
                      }
                    </div>
                    <div class="tbl-seatname">{{ seat.name }}</div>
                    <div class="tbl-seatleft">
                      {{ seat.remaining === 1 ? '1 left' : seat.remaining + ' left' }}
                    </div>
                  </div>
                }
              </div>
            }

            <!-- The middle: the card that was played, bigger. Not a panel about
                 the card — the point of a table is that it is lying there. -->
            @if (liveCard(); as live) {
              <div class="tbl-mid" [style.--seat]="live.speakerColor || '#c9a84c'">
                <div class="tbl-mid-top">
                  <span class="tbl-mid-who">{{ live.speakerName || 'Open' }}</span>
                  <span class="tbl-mid-sec">{{ live.section }}</span>
                </div>
                <p class="tbl-mid-text" dir="auto">{{ live.text || live.section }}</p>
                @if (live.subs.length) {
                  <ul class="tbl-mid-subs" dir="auto">
                    @for (sub of live.subs; track $index) { <li>{{ sub }}</li> }
                  </ul>
                }
                @if (live.bridge) { <div class="tbl-mid-bridge" dir="auto">↪ {{ live.bridge }}</div> }
              </div>
            } @else {
              <div class="tbl-mid tbl-mid--empty">Nobody has played a card yet.</div>
            }

            <!-- Your hand. Fanned, because a list of talking points is a script
                 and a script makes three people take turns reading it. -->
            <div class="tbl-handhead">
              <span>Your hand</span>
              <span>{{ hand().length === 1 ? '1 card' : hand().length + ' cards' }}</span>
            </div>
            @if (hand().length) {
              <div class="tbl-fan">
                @for (card of hand(); track card.id) {
                  <button type="button" class="tbl-card"
                          [style.--seat]="card.speakerColor || '#c9a84c'"
                          [style.transform]="'rotate(' + fanAngle($index) + 'deg) translate('
                            + fanShift($index) + 'px,' + fanLift($index) + 'px)'"
                          [style.zIndex]="$index"
                          (click)="play(card)">
                    <span class="tbl-card-sec">{{ card.section }}</span>
                    <span class="tbl-card-text" dir="auto">{{ card.text }}</span>
                    @if (card.subs.length) {
                      <ul class="tbl-card-subs" dir="auto">
                        @for (sub of card.subs.slice(0, 3); track $index) { <li>{{ sub }}</li> }
                      </ul>
                    }
                    @if (card.speakerRef === null) { <span class="tbl-card-open">Open</span> }
                  </button>
                }
              </div>
              <div class="tbl-hint">Tap a card to put it on the table</div>
            } @else {
              <div class="tbl-hint tbl-hint--empty">
                {{ spent().length ? 'You have played every card in your hand.'
                                  : 'No points are assigned to you in this episode.' }}
              </div>
            }
            @if (spent().length) {
              <div class="tbl-spent">{{ spent().length }} played</div>
            }
          </div>
        } @else {
        <div class="deck-strip" #strip>
          @for (card of cards(); track card.index) {
            <div class="deck-card"
                 [class.deck-card--live]="card.index === activeIndex()"
                 [class.deck-card--done]="card.index < activeIndex()">
              <div class="deck-card-top">
                <span class="deck-card-sec">{{ card.section }}</span>
                @if (card.index === activeIndex()) {
                  <span class="deck-card-flag">● Live</span>
                } @else if (card.index < activeIndex()) {
                  <span class="deck-card-tick">✓</span>
                }
              </div>
              @if (card.speakerName) {
                <div class="deck-card-speaker"
                     [style.color]="card.speakerColor || '#c9a84c'"
                     [style.borderColor]="card.speakerColor || '#c9a84c'">
                  🎙 {{ card.speakerName }}
                </div>
              }
              <p class="deck-card-text" dir="auto">{{ card.text || 'Section break' }}</p>
              @if (card.bridge) {
                <div class="deck-card-bridge" dir="auto">↪ {{ card.bridge }}</div>
              }
            </div>
          }
        </div>
        }
        @if (paused()) { <div class="deck-pausedbar">Paused</div> }
        <div class="deck-progress">
          <div class="deck-progress-bar"><span [style.width.%]="progressPct()"></span></div>
          <div class="deck-progress-text">
            {{ position().index + 1 }} / {{ position().total }}
          </div>
        </div>

        @if (isHost()) {
          <div class="deck-foot">
            <div class="deck-controls">
              <button type="button" class="deck-ctl" (click)="prev()"
                      [disabled]="atStart() || !connected()">⏮</button>
              <button type="button" class="deck-ctl" (click)="togglePause()"
                      [disabled]="!connected()">{{ paused() ? '▶' : '⏸' }}</button>
              <button type="button" class="deck-ctl" (click)="next()"
                      [disabled]="atEnd() || !connected()">⏭</button>
              <button type="button" class="deck-ctl deck-ctl--end" (click)="endSession()">⏹</button>
            </div>
          </div>
        } @else {
          <div class="deck-foot deck-foot--viewer">
            @if (!connected()) {
              Reconnecting…
            } @else if (isMyTurn()) {
              <button type="button" class="deck-btn deck-btn--gold deck-myturn"
                      (click)="next()" [disabled]="atEnd()">
                {{ atEnd() ? "You're done ✓" : "Done — next ▸" }}
              </button>
            } @else if (currentSpeaker(); as speaker) {
              <span class="deck-turndot" [style.background]="speaker.color"></span>
              {{ speaker.display_name }} is speaking…
            } @else {
              Following the host
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .deck {
      display: flex; flex-direction: column; height: 100dvh;
      background: radial-gradient(130% 75% at 50% 0%, #1e1b13 0%, #100e09 62%);
      color: #f4ecd8; font-family: var(--km-font-body, system-ui, sans-serif);
    }
    .deck-top {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .deck-x {
      background: transparent; border: none; color: rgba(255,255,255,0.6);
      font-size: 1.1rem; cursor: pointer;
    }
    .deck-title { flex: 1; font-size: 0.92rem; font-weight: 600; }
    .deck-viewers { font-size: 0.8rem; color: rgba(255,255,255,0.55); }

    /* ── The table ──────────────────────────────────────────────────────────
       Seats at the top with their remaining cards face down, the played card
       in the middle, your own hand fanned along the bottom. The board answers
       three questions from across a room without anyone saying them: whose
       turn it is, who has a lot left, and what is being talked about now. */
    .deck-switch {
      display: flex; gap: 6px; justify-content: center; padding: 10px 0 2px;
    }
    .deck-switch button {
      background: transparent; border: 1px solid rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.55); border-radius: 999px;
      padding: 4px 14px; font-size: 0.72rem; cursor: pointer;
    }
    .deck-switch button.on {
      color: #c9a84c; border-color: rgba(201,168,76,0.55);
      background: rgba(201,168,76,0.1);
    }

    .tbl {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      gap: 14px; padding: 10px 16px 20px; overflow-y: auto;
    }
    .tbl-seats { display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; }
    .tbl-seat {
      width: 108px; text-align: center; padding: 8px 6px;
      border: 1px solid transparent; border-radius: 12px;
    }
    .tbl-seat--on {
      border-color: color-mix(in srgb, var(--seat) 55%, transparent);
      background: color-mix(in srgb, var(--seat) 12%, transparent);
    }
    .tbl-backs { position: relative; height: 46px; }
    .tbl-back {
      position: absolute; left: 50%; bottom: 0; margin-left: -13px;
      width: 26px; height: 38px; border-radius: 4px;
      background: #161616;
      border: 1px solid color-mix(in srgb, var(--seat) 45%, transparent);
      transform-origin: bottom center;
    }
    .tbl-seatname { margin-top: 6px; font-size: 0.72rem; font-weight: 600; color: var(--seat); }
    .tbl-seatleft { font-size: 0.62rem; color: rgba(255,255,255,0.4); }

    .tbl-mid {
      width: min(320px, 92%); min-height: 190px; padding: 16px;
      border-radius: 14px; background: #121212;
      border: 1.6px solid var(--seat, rgba(255,255,255,0.12));
      box-shadow: 0 10px 28px rgba(0,0,0,0.55);
      display: flex; flex-direction: column; gap: 9px;
    }
    .tbl-mid--empty {
      align-items: center; justify-content: center; color: rgba(255,255,255,0.4);
      font-size: 0.82rem; border-style: dashed; box-shadow: none;
    }
    .tbl-mid-top { display: flex; justify-content: space-between; gap: 8px; }
    .tbl-mid-who {
      font-size: 0.66rem; font-weight: 700; letter-spacing: 0.09em;
      text-transform: uppercase; color: var(--seat);
    }
    .tbl-mid-sec {
      font-size: 0.6rem; letter-spacing: 0.09em; text-transform: uppercase;
      color: rgba(255,255,255,0.38);
    }
    .tbl-mid-text { margin: 0; font-size: 1.12rem; font-weight: 600; line-height: 1.35; }
    .tbl-mid-subs { margin: 0; padding-left: 16px; display: grid; gap: 5px; }
    .tbl-mid-subs li { font-size: 0.84rem; color: rgba(255,255,255,0.72); }
    .tbl-mid-bridge { margin-top: auto; font-size: 0.74rem; font-style: italic; color: rgba(255,255,255,0.42); }

    .tbl-handhead {
      width: min(520px, 100%); display: flex; justify-content: space-between;
      font-size: 0.64rem; letter-spacing: 0.13em; text-transform: uppercase;
      color: #c9a84c; margin-top: 4px;
    }
    .tbl-handhead span:last-child { color: rgba(255,255,255,0.4); letter-spacing: 0.04em; }

    /* Each card is rotated about a pivot below it, the way you hold them. */
    .tbl-fan { position: relative; height: 236px; width: 100%; }
    .tbl-card {
      position: absolute; left: 50%; bottom: 22px; margin-left: -66px;
      width: 132px; height: 186px; padding: 11px; cursor: pointer;
      display: flex; flex-direction: column; gap: 6px; text-align: left;
      border-radius: 10px; background: #131313;
      border: 1px solid color-mix(in srgb, var(--seat) 45%, transparent);
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      transform-origin: bottom center;
      transition: transform 180ms ease, box-shadow 180ms ease;
      color: inherit; font: inherit;
    }
    .tbl-card:hover, .tbl-card:focus-visible {
      box-shadow: 0 12px 26px rgba(0,0,0,0.62);
      border-color: var(--seat);
      z-index: 100 !important;
    }
    .tbl-card-sec {
      font-size: 0.56rem; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: var(--seat);
    }
    .tbl-card-text {
      font-size: 0.78rem; font-weight: 600; line-height: 1.3;
      display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .tbl-card-subs { margin: 0; padding-left: 13px; display: grid; gap: 2px; }
    .tbl-card-subs li {
      font-size: 0.6rem; color: rgba(255,255,255,0.55);
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .tbl-card-open {
      margin-top: auto; font-size: 0.55rem; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.4);
    }
    .tbl-hint { font-size: 0.68rem; color: rgba(255,255,255,0.35); }
    .tbl-hint--empty { padding: 30px 0; font-style: italic; }
    .tbl-spent { font-size: 0.66rem; color: rgba(255,255,255,0.35); }

    .deck-center {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 12px; text-align: center; padding: 24px;
      color: rgba(255,255,255,0.65);
    }
    .deck-bigicon { font-size: 2.6rem; opacity: 0.6; }
    .deck-center-actions { display: flex; gap: 10px; }

    .deck-stage {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 18px; padding: 40px 28px; text-align: center;
    }
    .deck-lobby { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .deck-roomcode {
      font-family: 'Courier New', monospace; font-size: 3rem; font-weight: 700;
      letter-spacing: 0.34em; color: var(--km-gold, #c9a84c); padding-left: 0.34em;
      text-shadow: 0 2px 18px rgba(201,168,76,0.5);
    }
    .deck-lobby h1 { margin: 6px 0 0; font-size: 1.5rem; }
    .deck-lobby p { margin: 0; color: rgba(255,255,255,0.5); }
    .deck-recon { color: var(--km-gold, #c9a84c) !important; font-size: 0.82rem; }

    .deck-roster {
      display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;
      margin-top: 4px; max-width: 420px;
    }
    .deck-rosterchip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 13px; border-radius: 16px;
      border: 1px solid rgba(201,168,76,0.4);
      background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
      box-shadow: 0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07);
      font-size: 0.85rem; font-weight: 600; color: #f4ecd8;
    }
    .deck-rosterdot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      box-shadow: 0 0 6px rgba(255,255,255,0.3);
    }
    .deck-rosterrole {
      font-size: 0.64rem; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--km-gold, #c9a84c);
    }
    .deck-guests { font-size: 0.8rem; color: rgba(255,255,255,0.5); margin: 0; }
    .deck-youare {
      font-size: 0.82rem; color: var(--km-gold, #c9a84c); margin: 0; font-weight: 600;
    }

    .deck-strip {
      flex: 1; display: flex; gap: 16px; overflow-x: auto;
      scroll-snap-type: x mandatory; padding: 24px 9vw; align-items: stretch;
    }
    .deck-strip::-webkit-scrollbar { height: 0; }
    .deck-card {
      flex: 0 0 86%; max-width: 680px; scroll-snap-align: center;
      display: flex; flex-direction: column; gap: 14px;
      padding: 26px 24px; border-radius: 18px;
      background: linear-gradient(180deg, #232017 0%, #131210 100%);
      border: 1px solid rgba(255,255,255,0.05);
      box-shadow: 0 16px 34px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.05);
      opacity: 0.42; transition: opacity 0.25s ease, border-color 0.25s ease;
    }
    .deck-card--done { opacity: 0.32; }
    .deck-card--live {
      opacity: 1; border-color: rgba(201,168,76,0.55);
      box-shadow: 0 18px 40px rgba(0,0,0,0.68), 0 0 24px rgba(201,168,76,0.16),
                  inset 0 1px 0 rgba(255,255,255,0.07);
    }
    .deck-card-top { display: flex; align-items: center; justify-content: space-between; }
    .deck-card-sec {
      font-size: 0.7rem; font-weight: 700; letter-spacing: 0.15em;
      text-transform: uppercase; color: var(--km-gold, #c9a84c);
    }
    .deck-card-flag {
      font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: #e8c96a;
    }
    .deck-card-tick { font-size: 0.9rem; color: #5cc94c; }
    .deck-card-speaker {
      align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 16px; border: 1.5px solid; border-radius: 20px;
      font-size: 0.86rem; font-weight: 600;
      background: linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.02));
    }
    .deck-card-text {
      flex: 1; font-size: 1.7rem; line-height: 1.45; font-weight: 500; margin: 0;
    }
    .deck-card-bridge {
      font-size: 1rem; line-height: 1.45; color: #e8c96a;
      padding-top: 14px; border-top: 1px dashed rgba(201,168,76,0.3);
    }
    .deck-pausedbar {
      text-align: center; font-size: 0.76rem; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase; color: #e0a32e; padding: 4px 0;
    }

    .deck-progress { padding: 8px 28px; }
    .deck-progress-bar {
      height: 5px; background: rgba(0,0,0,0.55); border-radius: 3px; overflow: hidden;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.85);
    }
    .deck-progress-bar span {
      display: block; height: 100%;
      background: linear-gradient(180deg, #e8c96a, #c9a84c);
      box-shadow: 0 0 9px rgba(201,168,76,0.6); transition: width 0.25s ease;
    }
    .deck-progress-text {
      margin-top: 6px; text-align: center; font-size: 0.74rem; color: rgba(255,255,255,0.45);
    }

    .deck-foot {
      padding: 14px 20px 22px; border-top: 1px solid rgba(255,255,255,0.07);
    }
    .deck-foot--viewer { text-align: center; font-size: 0.8rem; color: rgba(255,255,255,0.45); }
    .deck-controls { display: flex; align-items: center; justify-content: center; gap: 26px; }
    .deck-ctl {
      width: 52px; height: 52px; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 1.4rem;
      color: #f4ecd8;
      background: linear-gradient(180deg, #2a261c 0%, #15130e 100%);
      border: 1px solid rgba(255,255,255,0.06);
      box-shadow: 0 6px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07);
    }
    .deck-ctl:disabled { opacity: 0.3; cursor: default; box-shadow: none; }
    .deck-ctl--end { color: #e0584e; }

    .deck-btn {
      padding: 9px 16px; border-radius: 9px; font-size: 0.85rem; cursor: pointer;
      background: rgba(255,255,255,0.08); color: #f4ecd8; border: 1px solid rgba(255,255,255,0.14);
    }
    .deck-btn--gold {
      background: linear-gradient(180deg, #e8c96a, #c9a84c); color: #14110b; font-weight: 700;
      border-color: var(--km-gold, #c9a84c);
      box-shadow: 0 6px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25);
    }
    .deck-start { display: block; width: 100%; max-width: 320px; margin: 0 auto; padding: 12px; }
    .deck-start:disabled { opacity: 0.5; cursor: default; }
    .deck-myturn { padding: 11px 28px; font-size: 0.95rem; }
    .deck-myturn:disabled { opacity: 0.5; cursor: default; }
    .deck-turndot {
      display: inline-block; width: 9px; height: 9px; border-radius: 50%;
      margin-right: 7px; vertical-align: middle;
    }
  `],
})
export class LiveDeckComponent implements OnInit, OnDestroy {
  private studio = inject(StudioApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  code = '';

  loading = signal(true);
  error = signal<string | null>(null);
  ended = signal(false);
  connected = signal(false);
  role = signal<'host' | 'viewer'>('viewer');
  episodeTitle = signal('');
  sessionId = signal('');
  episode = signal<EpisodeAggregate | null>(null);
  cursor = signal<LiveCursor>(LOBBY);
  paused = signal(false);
  viewers = signal(1);
  roster = signal<RosterEntry[]>([]);
  you = signal<RosterEntry | null>(null);
  /** Ids of every card played. Authoritative — it comes from the session. */
  played = signal<ReadonlySet<string>>(new Set<string>());
  /** The table is what you play from; the running order is for reading ahead. */
  view = signal<'table' | 'order'>('table');

  private ws: WebSocket | null = null;
  private leaving = false;
  private reconnectAttempts = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('strip') private strip?: ElementRef<HTMLElement>;

  // ── Derived state ────────────────────────────────────────────────────────────

  isHost = computed(() => this.role() === 'host');
  inLobby = computed(() => this.cursor().section < 0);

  /** Identified cast members currently connected (named entries only). */
  namedRoster = computed(() => this.roster().filter((r) => !!r.name));
  /** Connected screens that did not resolve to a cast member. */
  guestCount = computed(() => this.roster().filter((r) => !r.name).length);

  currentSection = computed(() => {
    const ep = this.episode();
    const c = this.cursor();
    return ep && c.section >= 0 ? ep.sections[c.section] ?? null : null;
  });

  currentPoint = computed(() => {
    const section = this.currentSection();
    const c = this.cursor();
    return section && c.point >= 0 ? section.points[c.point] ?? null : null;
  });

  currentSpeaker = computed(() => {
    const point = this.currentPoint();
    const ep = this.episode();
    if (!point || !point.speaker_ref || !ep) return null;
    return ep.participants.find((p) => p.id === point.speaker_ref) ?? null;
  });

  stops = computed<LiveCursor[]>(() => {
    const ep = this.episode();
    if (!ep) return [];
    const out: LiveCursor[] = [];
    ep.sections.forEach((section, s) => {
      if (section.points.length === 0) out.push({ section: s, point: -1 });
      else section.points.forEach((_, p) => out.push({ section: s, point: p }));
    });
    return out;
  });

  position = computed(() => {
    const stops = this.stops();
    const c = this.cursor();
    const index = stops.findIndex((x) => x.section === c.section && x.point === c.point);
    return { index, total: stops.length };
  });

  progressPct = computed(() => {
    const { index, total } = this.position();
    return total > 0 && index >= 0 ? Math.round(((index + 1) / total) * 100) : 0;
  });

  atStart = computed(() => this.position().index <= 0);
  atEnd = computed(() => {
    const { index, total } = this.position();
    return index >= 0 && index >= total - 1;
  });

  /** Every talking point flattened to an ordered card, for the deck carousel. */
  cards = computed<DeckCard[]>(() => {
    const ep = this.episode();
    if (!ep) return [];
    const out: DeckCard[] = [];
    let i = 0;
    for (const section of ep.sections) {
      if (section.points.length === 0) {
        out.push({
          id: 'section-' + section.id,
          index: i++, section: section.heading, text: '', bridge: null,
          speakerName: null, speakerColor: null, speakerRef: null, subs: [],
        });
      } else {
        for (const point of section.points) {
          const speaker = point.speaker_ref
            ? ep.participants.find((p) => p.id === point.speaker_ref) ?? null
            : null;
          out.push({
            id: point.id,
            index: i++, section: section.heading, text: point.text,
            bridge: point.bridge, speakerName: speaker?.display_name ?? null,
            speakerColor: speaker?.color ?? null, speakerRef: point.speaker_ref,
            subs: subsOf(point.subs_json),
          });
        }
      }
    }
    return out;
  });

  activeIndex = computed(() => this.position().index);

  /** The card in the middle — what is being spoken now. */
  liveCard = computed<DeckCard | null>(() => this.cards()[this.activeIndex()] ?? null);

  /** Your hand: your own cards, plus any nobody was assigned. An unclaimed
   *  question belongs to whoever reaches for it — the same rule the Durable
   *  Object enforces, so a card is never offered for a play it would refuse. */
  hand = computed<DeckCard[]>(() => {
    const me = this.you()?.participantId ?? null;
    const played = this.played();
    return this.cards().filter((c) => {
      if (played.has(c.id) || !c.text) return false;
      return c.speakerRef === null || c.speakerRef === me;
    });
  });

  /** Yours that are spent. They stay: mid-session the useful question is often
   *  what you have already said. */
  spent = computed<DeckCard[]>(() => {
    const me = this.you()?.participantId ?? null;
    const played = this.played();
    return this.cards().filter(
      (c) => played.has(c.id) && (c.speakerRef === me || c.speakerRef === null));
  });

  /** Everyone else, in the order they first speak. Seats come from the cards
   *  rather than the roster, so somebody holding no points does not get a chair
   *  with nothing on it. */
  seats = computed<Seat[]>(() => {
    const me = this.you()?.participantId ?? null;
    const played = this.played();
    const live = this.liveCard();
    const order: string[] = [];
    const info = new Map<string, { name: string; color: string }>();
    for (const card of this.cards()) {
      const ref = card.speakerRef;
      if (!ref || ref === me) continue;
      if (!info.has(ref)) {
        order.push(ref);
        info.set(ref, { name: card.speakerName ?? '—', color: card.speakerColor || '#c9a84c' });
      }
    }
    return order.map((ref) => {
      const remaining = this.cards()
        .filter((c) => c.speakerRef === ref && !played.has(c.id) && !!c.text).length;
      return {
        ref,
        name: info.get(ref)!.name,
        color: info.get(ref)!.color,
        remaining,
        speaking: live?.speakerRef === ref,
        pips: Array.from({ length: Math.min(remaining, 6) }, (_, i) => i),
      };
    });
  });

  /** How far each card in the fan is rotated and pushed out from the middle.
   *  The gap is a fraction of the card width rather than a fixed pixel value:
   *  at a fixed one a two-card hand sat almost exactly on top of itself. */
  fanAngle(i: number): number {
    const n = this.hand().length;
    if (n < 2) return 0;
    const step = Math.min(11, 64 / (n - 1));
    return (i - (n - 1) / 2) * step;
  }

  fanShift(i: number): number {
    const n = this.hand().length;
    if (n < 2) return 0;
    const gap = Math.max(30, Math.min(58, 320 / (n - 1)));
    return (i - (n - 1) / 2) * gap;
  }

  /** How far apart a seat's face-down cards sit. Same trap as the hand: at a
   *  fixed offset a two-card pile reads as one thick card. */
  backShift(count: number, i: number): number {
    if (count < 2) return 0;
    const gap = Math.max(8, Math.min(17, 62 / (count - 1)));
    return (i - (count - 1) / 2) * gap;
  }

  backAngle(count: number, i: number): number {
    if (count < 2) return 0;
    return (i - (count - 1) / 2) * 9;
  }

  fanLift(i: number): number {
    const n = this.hand().length;
    if (n < 2) return 0;
    return Math.abs(i - (n - 1) / 2) * 5;
  }

  /** Put a card on the table. The session decides whether it is yours to play,
   *  so nothing is changed locally first — a refused play simply does nothing
   *  rather than moving and snapping back. */
  play(card: DeckCard): void {
    this.send({ t: 'play', card: card.id });
  }

  /** True when the current card is assigned to this viewer — their turn to push. */
  isMyTurn = computed(() => {
    const me = this.you();
    const card = this.cards()[this.activeIndex()];
    return !!me?.participantId && !!card && card.speakerRef === me.participantId;
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.code = (this.route.snapshot.paramMap.get('code') ?? '').toUpperCase();
    if (!this.code) {
      this.error.set('No session code was provided.');
      this.loading.set(false);
      return;
    }
    this.studio.getSession(this.code).subscribe({
      next: (info) => {
        this.episodeTitle.set(info.episode_title ?? 'Episode');
        this.sessionId.set(info.session_id);
        this.role.set(info.host ? 'host' : 'viewer');
        this.connect();
      },
      error: () => {
        this.error.set('That session could not be found — it may have ended.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  // ── WebSocket ────────────────────────────────────────────────────────────────

  private connect(): void {
    let socket: WebSocket;
    try {
      socket = new WebSocket(this.buildWsUrl());
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      this.connected.set(true);
      this.reconnectAttempts = 0;
      this.startPing();
    };
    socket.onmessage = (ev: MessageEvent) => this.onMessage(ev);
    socket.onerror = () => { /* an onclose always follows */ };
    socket.onclose = () => {
      this.connected.set(false);
      this.stopPing();
      if (!this.leaving && !this.ended()) this.scheduleReconnect();
    };
  }

  private onMessage(ev: MessageEvent): void {
    const raw = typeof ev.data === 'string' ? ev.data : '';
    if (!raw || raw === 'pong') return;

    let msg: LiveMessage;
    try {
      msg = JSON.parse(raw) as LiveMessage;
    } catch {
      return;
    }

    switch (msg.t) {
      case 'sync':
        if (msg.episode) this.episode.set(msg.episode);
        if (msg.cursor) this.cursor.set(msg.cursor);
        if (typeof msg.paused === 'boolean') this.paused.set(msg.paused);
        if (typeof msg.viewers === 'number') this.viewers.set(msg.viewers);
        if (msg.role) this.role.set(msg.role);
        if (msg.roster) this.roster.set(msg.roster);
        if (msg.you) this.you.set(msg.you);
        if (msg.played) this.played.set(new Set(msg.played));
        this.loading.set(false);
        break;
      case 'cursor':
        if (msg.cursor) this.cursor.set(msg.cursor);
        if (typeof msg.paused === 'boolean') this.paused.set(msg.paused);
        if (msg.played) this.played.set(new Set(msg.played));
        break;
      case 'presence':
        if (typeof msg.viewers === 'number') this.viewers.set(msg.viewers);
        if (msg.roster) this.roster.set(msg.roster);
        break;
      case 'ended':
        this.ended.set(true);
        this.loading.set(false);
        this.closeSocket();
        break;
    }
    if (msg.t === 'sync' || msg.t === 'cursor') {
      setTimeout(() => this.scrollToActive(), 90);
    }
  }

  /** Centre the live card in the carousel when the synced cursor moves. */
  private scrollToActive(): void {
    const el = this.strip?.nativeElement;
    if (!el) return;
    const card = el.children[this.activeIndex()] as HTMLElement | undefined;
    card?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }

  private buildWsUrl(): string {
    const api = environment.apiBase;
    let base: string;
    if (api.startsWith('https://')) {
      base = 'wss://' + api.slice('https://'.length);
    } else if (api.startsWith('http://')) {
      base = 'ws://' + api.slice('http://'.length);
    } else {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      base = `${proto}//${location.host}${api}`;
    }
    const token = localStorage.getItem('km_token') ?? '';
    return `${base}/st/sessions/${encodeURIComponent(this.code)}/live`
      + `?token=${encodeURIComponent(token)}`;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= 5) {
      this.error.set('Lost connection to the session.');
      return;
    }
    const delay = Math.min(8000, 1000 * 2 ** this.reconnectAttempts);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      try { this.ws?.send('ping'); } catch { /* socket gone */ }
    }, 25000);
  }

  private stopPing(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  private closeSocket(): void {
    this.stopPing();
    const socket = this.ws;
    this.ws = null;
    if (socket) {
      socket.onclose = null;
      socket.onmessage = null;
      try { socket.close(); } catch { /* already closed */ }
    }
  }

  private teardown(): void {
    this.leaving = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.closeSocket();
  }

  // ── Host actions ─────────────────────────────────────────────────────────────

  private send(msg: string | Record<string, unknown>): void {
    const payload = typeof msg === 'string' ? { t: msg } : msg;
    try { this.ws?.send(JSON.stringify(payload)); } catch { /* socket gone */ }
  }

  next(): void { this.send('next'); }
  prev(): void { this.send('prev'); }
  togglePause(): void { this.send(this.paused() ? 'resume' : 'pause'); }

  endSession(): void {
    if (window.confirm('End the session? Every connected screen returns to Studio.')) {
      this.send('end');
    }
  }

  leave(): void {
    this.teardown();
    this.router.navigate(['/studio']);
  }

  viewRecap(): void {
    const id = this.sessionId();
    this.teardown();
    this.router.navigate(id ? ['/studio/recap', id] : ['/studio']);
  }
}
