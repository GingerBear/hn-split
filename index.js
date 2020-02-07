import {
  html,
  Component,
  render
} from 'https://unpkg.com/htm/preact/standalone.module.js';

import { fetchIdsByType, fetchItems, fetchItem } from './api.js';

function getTopItems(page = 1, perPage = 15) {
  return fetchIdsByType('top').then(itemIds => {
    itemIds = itemIds.slice(
      (page - 1) * perPage,
      (page - 1) * perPage + perPage
    );

    return fetchItems(itemIds);
  });
}

function decode(str) {
  const s = '<b>' + str + '</b>';
  let e = document.createElement('decodeIt');
  e.innerHTML = s;
  return e.innerText;
}

class App extends Component {
  componentDidMount() {
    let handlePageChange = () => {
      this.setState({ page: null });

      if (location.hash.indexOf('#item/') === 0) {
        let id = location.hash.replace('#item/', '');
        fetchItem(id).then(item => {
          this.setState({ page: 'itemDetail', item: item });
          attachComments(item).then(item => {
            this.setState({
              page: 'itemDetail',
              commentAttached: true,
              item: item
            });
          });
        });
      } else if (location.hash.indexOf('#p/') === 0) {
        let page = +location.hash.replace('#p/', '');

        getTopItems(page).then(items => {
          this.setState({ page: 'itemList', items: items, p: page });
        });
      } else {
        getTopItems().then(items => {
          this.setState({ page: 'itemList', items: items, p: 1 });
        });
      }
    };

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
        return item;
      }
    }

    window.addEventListener('hashchange', handlePageChange, false);
    handlePageChange();
  }

  render({}, { page = null, ...state }) {
    if (page === 'itemList') {
      return this.renderItemList(state);
    } else if (page === 'itemDetail') {
      return this.renderItemDetail(state);
    } else {
      return 'loading...';
    }
  }

  renderItemList({ items, p }) {
    console.log(items);

    return html`
      <div class="item-list-page">
        <h1 class="title-link">
          <a href="#">HN</a>
        </h1>

        <ul>
          ${items.map(
            item => html`
              <li class="item">
                <div>
                  <a class="item-link" href="#item/${item.id}">${item.title}</a>
                </div>
                <div class="item-metas">
                  <span>${item.score} points</span>
                  <span>by ${item.by}</span>
                  <span>${' | '}${item.descendants} comments</span>
                </div>
              </li>
            `
          )}
        </ul>
        <a class="more-link" href="#p/${p + 1}">More</a>
      </div>
    `;
  }

  renderItemDetail({ item }) {
    console.log(item);
    if (!item) return null;

    return html`
      <div class="item-detail-page">
        <div class="item-section">
          <a class="back-button" href="javascript:history.back()">Back</a>
          <h1>${item.title}</h1>
          <a class="item-url" href="${item.url}">${item.url}</a>
          ${(item.kidsItems || []).map(item => this.renderComment(item))}
        </div>
        <div class="article-section">
          <iframe src="${item.url}" />
        </div>
      </div>
    `;
  }

  renderComment(item) {
    return html`
      <div class="kid">
        <div class="comment-by">${item.by}</div>
        <div class="comment-text">${decode(item.text)}</div>
        <div class="kids">
          ${(item.kidsItems || []).map(item => this.renderComment(item))}
        </div>
      </div>
    `;
  }
}

render(
  html`
    <${App} page="All" />
  `,
  document.body
);
