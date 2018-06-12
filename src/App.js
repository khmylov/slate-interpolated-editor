import React, {Component} from 'react';
import './App.css';
import {Editor} from 'slate-react';
import {Value} from 'slate';

const initialValue = Value.fromJSON({
  document: {
    nodes: [
      {
        object: 'block',
        type: 'text',
        nodes: [
          {
            object: 'text',
            leaves: [{text: 'Hello, '}]
          },
          {
            object: 'inline',
            type: 'expression',
            nodes: [
              {
                object: 'text',
                leaves: [
                  {text: '{{Feature.Name}}'}
                ]
              }
            ]
          }
        ]
      }
    ]
  }
});

function findChildOrSelf(node, predicate) {
  if (predicate(node)) {
    return node;
  }

  switch (node.object) {
    case 'document':
    case 'block':
    case 'inline':
      for (const child of node.nodes) {
        const matching = findChildOrSelf(child, predicate);
        if (matching) {
          return matching;
        }
      }
  }

  return null;
}

function getSuggestionsFor(text) {
  if (text === null || text === undefined) {
    return [];
  }

  const split = text.split('.');
  text = split[split.length - 1];

  const fields = [
    'name',
    'feature',
    'epic',
    'project',
    'description',
    'startdate',
    'enddate',
    'plannedstartdate',
    'plannedenddate',
    'leadtime',
    'cycletime',
    'firstname',
    'lastname',
    'user',
    'owner'
  ];

  text = text.toLowerCase();

  return fields.filter(x => x.includes(text));
}

class App extends Component {
  state = {
    value: initialValue,
    currentSuggestions: [],
    suggestionSourceText: null
  };

  onChange = (change) => {
    const {value} = change;
    const invalidExpressionInline = findChildOrSelf(
      value.document,
      node => node.type === 'expression' &&
        (!node.text.startsWith('{{') || !node.text.endsWith('}}')));
    if (invalidExpressionInline) {
      const previousText = value.document.getPreviousSibling(invalidExpressionInline.key);
      if (previousText) {
        let newText = invalidExpressionInline.text;
        while (newText.startsWith('{')) {
          newText = newText.substr(1);
        }
        while (newText.endsWith('}')) {
          newText = newText.substr(0, newText.length - 1);
        }

        change
          .removeNodeByKey(invalidExpressionInline.key)
          .insertText(newText);
      }
    }

    let suggestionSourceText = null;
    if (value.focusText && value.focusInline && value.focusInline.type === 'expression') {
      suggestionSourceText = value.focusText.text;
      suggestionSourceText = suggestionSourceText.substr(0, suggestionSourceText.length - 2);
      suggestionSourceText = suggestionSourceText.substr(2, value.selection.startOffset - 2);
    }

    this.setState({value: change.value, suggestionSourceText});
  };

  renderMark = (props) => {
  };

  renderNode = (props) => {
    switch (props.node.type) {
      case 'expression':
        return (
          <span
            {...props.attributes}
            style={{backgroundColor: '#aaa', fontFamily: 'monospace'}}
          >
                        {props.children}
                    </span>
        );
    }
  };

  onKeyUp = (event, change, editor) => {
    const {value} = change;

    const {focusText} = value;
    const currentSubString = focusText.text.substr(0, value.selection.startOffset);

    if (!value.focusInline && event.key === '{' && currentSubString.endsWith('{{')) {
      change
        .insertInlineAtRange(value.selection, {
          type: 'expression',
          nodes: [
            {object: 'text', leaves: [{text: '{{}}'}]}
          ]
        })
        .removeTextByKey(focusText.key, currentSubString.length - 2, 2)
        .collapseToStartOfPreviousText()
        .move(2);
    }
  };

  render() {
    return (
      <div className="App">
        <div className="App-intro">
          <Editor
            value={this.state.value}
            onChange={this.onChange}
            onKeyUp={this.onKeyUp}
            renderNode={this.renderNode}
            renderMark={this.renderMark}
            placeholder="Start typing..., use {{ for refs"
          />
          <div style={{marginTop: '30px'}}>
            {this.state.suggestionSourceText ? (
              <div>
                <em>Building suggestions for {this.state.suggestionSourceText}:</em>
                <ul>
                  {getSuggestionsFor(this.state.suggestionSourceText).map(s => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}

          </div>
        </div>
      </div>
    );
  }
}

export default App;
