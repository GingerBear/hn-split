import { fetchIdsByType, fetchItems, fetchItem } from './api.js';

function getTopItems(page = 1, perPage = 10) {
  return fetchIdsByType('top').then(itemIds => {
    itemIds = itemIds.slice(
      (page - 1) * perPage,
      (page - 1) * perPage + perPage
    );

    return fetchItems(itemIds);
  });
}

function attachComments(item) {
  if (item && item.kids) {
    return fetchItems(item.kids)
      .then(items => {
        return Promise.all(items.map(attachComments));
      })
      .then(items => {
        item.kidsItems = items;
        return item;
      });
  } else {
    return Promise.resolve(item);
  }
}

function parseHost(url) {
  let hostPart = url
    .replace(/^https?:\/\//, '')
    .split('/')
    .shift()
    .split('.');

  if (hostPart[0] === 'www') {
    hostPart.shift();
  }

  return hostPart.join('.');
}

function renderItemList({ items, p }) {
  console.log(items);
  return `
    <div class="item-list-page">
      
      <h1 class="title-link">
        <a href="#">HN</a>
      </h1>

      <ul>
        ${items
          .map(
            item => `
            <li class="item">
              <div>
                <a class="item-link" href="#item/${item.id}">${item.title}</a>
              </div>
              <div class="item-metas">
                <span>${item.score} points</span>
                <span>by ${item.by}</span>
                ${item.url ? `<span>${' | '}${parseHost(item.url)}</span>` : ''}
                <span>${' | '}${item.descendants} comments</span>
              </div>
            </li>
          `
          )
          .join('')}
      </ul>

      <a class="more-link" href="#p/${p + 1}">More</a>

    </div>
  `;
}

function renderItemDetail({ item }) {
  console.log(item);
  let { title, score, by, text, url, descendants } = item;

  return `
    <div class="item-detail-page">
      <div class="item-section">
        <a class="back-button" href="javascript:history.back()">Back</a>
        <h1>${title}</h1>

        <div class="item-metas">
          <span>${score} points</span>
          <span>by ${by}</span>
          <span>${' | '}${descendants} comments</span>
        </div>

        ${url ? `<a class="item-url" href="${url}">${url}</a>` : ''}
        ${text ? `<div class="item-text" href="${text}">${text}</div>` : ''}

        <div class="item-comments">
          <div class="loading-comments">loading comments...</div>
        </div>

      </div>
      <div class="article-section">
        ${url ? `<iframe src="${url}" />` : ''}
      </div>
    </div>
  `;
}

function renderLoading() {
  return `<div class="loading-page">loading...</div>`;
}

function renderComment(item) {
  if (!item || !item.text) return '';

  return `
    <div class="kid">
      <div class="comment-by">${item.by}</div>
      <div class="comment-text">${item.text}</div>
      <div class="kids">
        ${(item.kidsItems || []).map(renderComment).join('')}
      </div>
    </div>
  `;
}

function render(state) {
  switch (state.page) {
    case 'itemList':
      document.body.innerHTML = renderItemList(state);
      document.title = 'HN Split';
      break;
    case 'itemDetail':
      document.body.innerHTML = renderItemDetail(state);
      document.title = state.item.title;
      break;
    default:
      document.body.innerHTML = renderLoading();
      break;
  }
}

function insertCommentView(item) {
  console.log('item', item);
  if (item.kidsItems) {
    document.querySelector('.item-comments').innerHTML = (item.kidsItems || [])
      .map(renderComment)
      .join('');
  } else {
    document.querySelector('.item-comments').innerHTML = 'no comments.';
  }
}

let lock = {
  _count: 0,
  refresh() {
    this._count++;
    return this._count;
  },
  valid(count) {
    return count === this._count;
  }
};

function main() {
  let state = {};
  let routes = [
    {
      match: () => location.hash.indexOf('#item/') === 0,
      handler: () => {
        let id = location.hash.replace('#item/', '');
        let key = lock.refresh();

        fetchItem(id).then(item => {
          if (!lock.valid(key)) return;

          render({
            ...state,
            page: 'itemDetail',
            item: item
          });

          attachComments(item).then(item => {
            insertCommentView(item);
          });
        });
      }
    },
    {
      match: () => location.hash.indexOf('#p/') === 0,
      handler: () => {
        let page = +location.hash.replace('#p/', '');
        let key = lock.refresh();

        getTopItems(page).then(items => {
          if (!lock.valid(key)) return;

          render({
            ...state,
            page: 'itemList',
            items: items,
            p: page
          });
        });
      }
    },
    {
      match: '*',
      handler: () => {
        let key = lock.refresh();
        getTopItems().then(items => {
          if (!lock.valid(key)) return;

          render({
            ...state,
            page: 'itemList',
            items: items,
            p: 1
          });
        });
      }
    }
  ];

  function handlePageChange() {
    render({ ...state, page: null });

    for (let pageHandler of routes) {
      if (pageHandler.match === '*' || pageHandler.match()) {
        pageHandler.handler();
        return;
      }
    }
  }

  window.addEventListener('hashchange', handlePageChange, false);
  handlePageChange();
}

main();
