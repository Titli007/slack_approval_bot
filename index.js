const { App } = require('@slack/bolt');
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});


// Handle the '/approval-test' slash command
app.command('/approval-test', async ({ ack, body, client }) => {
  try {
    // Acknowledge the command request
    await ack();

    // Open the modal view
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'approval-modal',
        title: {
          type: 'plain_text',
          text: 'Request Approval'
        },
        submit: {
          type: 'plain_text',
          text: 'Submit'
        },
        close: {
          type: 'plain_text',
          text: 'Cancel'
        },
        blocks: [
          {
            type: 'input',
            block_id: 'approver',
            element: {
              type: 'users_select',
              placeholder: {
                type: 'plain_text',
                text: 'Select an approver'
              },
              action_id: 'approver'
            },
            label: {
              type: 'plain_text',
              text: 'Approver'
            }
          },
          {
            type: 'input',
            block_id: 'approval_details',
            element: {
              type: 'plain_text_input',
              action_id: 'approval_details',
              multiline: true
            },
            label: {
              type: 'plain_text',
              text: 'Approval Details'
            }
          }
        ]
      }
    });
  } catch (error) {
    console.error(error);
  }
});

// Handle the modal submission
app.view('approval-modal', async ({ ack, body, client, view }) => {
  try {
    // Extract the selected approver and approval details
    const approver_id = view.state.values.approver.approver.selected_user;
    const approvalDetails = view.state.values.approval_details.approval_details.value;

    const requester_id = body.user.id

    const approval_text = `You have a new approval request:\n*${approvalDetails}*`
    const requester = `*Requested By:*\n<@${body.user.id}>`
    const approver_name = `*Requested To:*\n<@${approver_id}>`

    // Send the approval request to the approver
    await client.chat.postMessage({
        channel: approver_id,
        text: `You have a new approval request:\n${approvalDetails}`, // Include the text content here
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": approval_text
            }
          },
          {
            "type": "section",
            "fields": [
              {
                "type": "mrkdwn",
                "text": requester
              },
              {
                "type": "mrkdwn",
                "text": "*status:*\nPending"
              },
              {
                "type": "mrkdwn",
                "text": approver_name
              },
              {
                "type": "mrkdwn",
                "text": "*Required By:*\nEveryone"
              }
            ]
          },
          {
            "type": "actions",
            "elements": [
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "emoji": true,
                  "text": "Approve"
                },
                "style": "primary",
                "value": `approve_${requester_id}`,
                "action_id": "approve_button",
              },
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "emoji": true,
                  "text": "Reject"
                },
                "style": "danger",
                "value": `reject_${requester_id}`,
                "action_id": "reject_button",
              }
            ]
          }
        ]
      }
        
    );

    await client.chat.postMessage({
      channel: requester_id,
      text: `Your approval request has been sent to <@${approver_id}>\n*Approval Request Description* : ${approvalDetails}`, // Include the text content here
      }
      
  );

    // Acknowledge the view
    await ack();
  } catch (error) {
    console.error(error);
  }
});



// Handle the button clicks (approve and reject)
app.action('approve_button', async ({ ack, body, client, action }) => {
    try {
      // Get the requester's user ID from the payload


      const requester_id = action.value.split('_')[1];

      const approver_id = body.user.id;
  
      // Notify the requester about the approval decision
      await client.chat.postMessage({
        channel: requester_id, // Send the message to the requester's channel
        text: `Your request has been approved by <@${approver_id}>.`
      });

      await client.chat.postMessage({
        channel: approver_id, // Send the message to the requester's channel
        text: `Approval from <@${requester_id}> accepted successfully`
      });
  
      // Acknowledge the action
      await ack();
    } catch (error) {
      console.error(error);
    }
  });
  
  app.action('reject_button', async ({ ack, body, client, action }) => {
    try {
      // Get the requester's user ID from the payload
      const requester_id = action.value.split('_')[1];

      const approver_id = body.user.id;

      console.log(body)
  
      // Notify the requester about the rejection
      await client.chat.postMessage({
        channel: requester_id, // Send the message to the requester's channel
        text: `Your request has been rejected by <@${approver_id}>.`
      });

      await client.chat.postMessage({
        channel: approver_id, // Send the message to the requester's channel
        text: `Approval from <@${requester_id}> rejected successfully`
      });
  
      // Acknowledge the action
      await ack();
    } catch (error) {
      console.error(error);
    }
  });

(async () => {
  // Start the Bolt app
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();