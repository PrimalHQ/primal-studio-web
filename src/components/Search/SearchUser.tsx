import { Component, createEffect, createSignal, For, onMount } from 'solid-js';

import styles from './SearchUser.module.scss';
import { Search } from '@kobalte/core/search';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { createStore } from 'solid-js/store';
import { PrimalUser } from 'src/primal';
import SearchOption from './SearchOptions';
import { findUserByNpub, findUsers } from 'src/stores/SearchStore';
import { userName } from 'src/utils/profile';
import { nip05Verification } from 'src/utils/ui';
import Avatar from '../Avatar/Avatar';
import { logError } from 'src/utils/logger';


const SearchUser: Component<{
  id?: string,
  placeholder?: string,
  onSelect?: (pubkey: string, user?: PrimalUser) => void,
}> = (props) => {

  let userInput: HTMLInputElement | undefined;

  let pop: TippyInstance | undefined;

  const [suggestedTerm, setSuggestedTerm] = createSignal('');
  const [suggestions, setSuggestions] = createStore<PrimalUser[]>([]);

  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);

  onMount(() => {
    setupUserSuggestions();
  })

  createEffect(() => {
    if (suggestions.length > 0) {
      pop?.show();
    } else {
      pop?.hide();
    }
  })

  const setupUserSuggestions = () => {
    const target = document.getElementById('search_users');
    if (!userInput || !target) return;


    let component = (
      <div class={styles.suggest}>
        <For each={suggestions}>
          {(user, index) => (
            <SearchOption
              id={`mention_suggested_user_${index()}`}
              title={userName(user.pubkey)}
              description={nip05Verification(user)}
              icon={<Avatar user={user} size={32} />}
              statNumber={user.userStats?.followers_count}
              statLabel={"Followers"}
              // @ts-ignore
              onClick={() => {
                if (!userInput) return;

                userInput.value = user.pubkey;
                onSelect();

              }}
              highlighted={highlightedUser() === index()}
            />
          )}
        </For>
      </div>);

    // @ts-ignore
    pop = tippy(target, {
      content: component,
      // showOnCreate: true,
      interactive: true,
      trigger: 'manual',
      placement: 'bottom-start',
      appendTo: 'parent',
      sticky: 'reference',
      onShow(instance) {
        userInput.addEventListener('keydown', onKeyDown);
      },
      onHide(instance) {
        userInput.removeEventListener('keydown', onKeyDown);
      },
    });
  };


  const onKeyDown = (e: KeyboardEvent) => {

    if (e.key === 'Escape') {
      pop?.hide();
      return true;
    }

    if (e.key === 'ArrowDown') {
      setHighlightedUser(i => {
        if (suggestions.length === 0) {
          return 0;
        }

        return i < suggestions.length ? i + 1 : 0;
      });

      return true;
    }

    if (e.key === 'ArrowUp') {
      setHighlightedUser(i => {
        if (suggestions.length === 0) {
          return 0;
        }

        return i > 0 ? i - 1 : suggestions.length;
      });
      return true;
    }


    if (['Enter', 'Space', 'Comma', 'Tab'].includes(e.code)) {
      const sel = document.getElementById(`mention_suggested_user_${highlightedUser()}`);

      sel && sel.click();

      return true;
    }

    return false;

  };

  const filterUsers = async (term: string) => {
    const users = await findUsers(term);
    setSuggestions(() => [...users])
    setSuggestedTerm(() => term);
  }

  const onInput = async (value: string) => {
    if (value.startsWith('npub') || value.startsWith('nprofile')) {
      const users = await findUserByNpub(value);

      setSuggestions(() => [...users])
      return;
    }

    filterUsers(value);
  };


  const onSelect = async () => {
    if (!userInput || userInput.value === '') {
      return;
    }

    try {
      const value = userInput.value;

      userInput.value = '';

      const user = suggestions.find(u => u.pubkey === value);

      props.onSelect && props.onSelect(value, user);
      setSuggestions(() => []);
      setHighlightedUser(() => 0);
    } catch (e) {
      logError('invalid pubkey input ', e);
    }
  }

  return (
    <Search
      options={[]}
      onInputChange={onInput}
      debounceOptionsMillisecond={300}
      placeholder={props.placeholder}
      class={styles.searchHolder}
    >
      <Search.Control class={styles.settingsInput}>
        <Search.Input
          id="search_users"
          ref={userInput}
          onKeyDown={(e: KeyboardEvent) => {
            if (suggestions.length > 0) return;

            if (e.key === 'Enter') {
              onSelect();
            }
          }}
        />
        <ButtonPrimary onClick={onSelect}>
          Add
        </ButtonPrimary>
      </Search.Control>
    </Search>
  );
}

export default SearchUser;
