import React, { Component } from "react";
import { Link } from "react-router-dom";

import { graphql, compose, withApollo } from "react-apollo";
import QueryAllEvents from "../GraphQL/QueryAllEvents";
import MutationDeleteEvent from "../GraphQL/MutationDeleteEvent";

import moment from "moment";

class AllEvents extends Component {

    state = {
        busy: false,
    }

    static defaultProps = {
        events: [],
        deleteEvent: () => null,
    }

    async handleDeleteClick(event, e) {
        e.preventDefault();

        if (window.confirm(`Are you sure you want to delete event ${event.id}`)) {
            const { deleteEvent } = this.props;

            await deleteEvent(event);
        }
    }

   
    handleSync = async () => {
        const { client } = this.props;
        const query = QueryAllEvents;

        this.setState({ busy: true });

        await client.query({
            query,
            fetchPolicy: 'network-only',
        });

        this.setState({ busy: false });
    }

    renderEvent = (event) => (
        <Link to={`/event/${event.id}`} className="card" key={event.id} style={{width:'48%',marginLeft:'13px'}}>
            <div className="content">
                <div className="header">{event.name}</div>
            </div>
            <br/>
            <div className="ui three column grid" style={{textAlign:'justify', marginLeft:'10px'}}>
            <div class="column">
            <div className="content">
                <p><i className="icon calendar"></i>{moment(event.when).format('LL')}</p>
                <p><i className="icon clock"></i>{moment(event.when).format('LT')}</p>
                <p><i className="icon marker"></i>{event.where}</p>
            </div>
            </div>
            <div class="column">
            <div className="content">
                <div className="description"><i className="icon info circle"></i>{event.description}</div>
            </div>
            <div className="extra content">
                <i className="icon comment"></i> {event.comments.items.length} comments
            </div>
            </div>
            <div class="column">
            <button className="btn btn-advanced" onClick={this.handleDeleteClick.bind(this, event)} style={{width:'140px', margin:'0 auto'}}>
                <i className="trash icon"></i>
                Delete
            </button>
            </div>
            </div>
        </Link>
    );

    render() {
        debugger;
        const { busy } = this.state;
        const { events } = this.props;

        return (
            <div>
                <div className="ui clearing basic segment">
                    <h1 className="ui header left floated">All Notifications</h1>
                    <button className="ui icon left basic button" onClick={this.handleSync} disabled={busy} style={{float:'right'}}>
                        <i aria-hidden="true" className={`refresh icon ${busy && "loading"}`}></i>
                        Sync with Server
                    </button>
                </div>
                <div className="ui link cards">
                    <div className="card">
                        <Link to="/newEvent" className="center aligned">
                            <i className="icon add massive"></i>
                            <p>Create Notification</p>
                        </Link>
                    </div>
                    {[].concat(events).sort((a, b) => a.when.localeCompare(b.when)).map(this.renderEvent)}
                </div>
            </div>
        );
    }

}

export default withApollo(compose(
    graphql(
        QueryAllEvents,
        {
            options: {
                fetchPolicy: 'network-only',
            },
            props: ({ data: { listEvents = { items: [] } } }) => ({
                events: listEvents.items
            })
        }
    ),
    graphql(
        MutationDeleteEvent,
        {
            options: {
                update: (proxy, { data: { deleteEvent } }) => {
                    const query = QueryAllEvents;
                    const data = proxy.readQuery({ query });

                    data.listEvents.items = data.listEvents.items.filter(event => event.id !== deleteEvent.id);

                    proxy.writeQuery({ query, data });
                }
            },
            props: (props) => ({
                deleteEvent: (event) => {
                    return props.mutate({
                        variables: { id: event.id },
                        optimisticResponse: () => ({
                            deleteEvent: {
                                ...event, __typename: 'Event', comments: { __typename: 'CommentConnection', items: [] }
                            }
                        }),
                    });
                }
            })
        }
    )
)(AllEvents));
