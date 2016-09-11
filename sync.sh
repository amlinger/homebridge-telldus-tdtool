#!/bin/bash

# This rsyncs the distribution folder to a given device
# over SSH. This assumes that you have:
#
# 1. rsync installed.
# 2. SSH keys setup for your remote target.
# 3. You are running homebridge with systemd (see descripton
#    at the bottom).

# The first argument if submitted, is supposed to be the
# SSH user/ip-address pair, or a name of a session configured
# in your ~/.ssh/config.
#
# This assumes that you have SSH keys setup, and have an entry
# in your SSH config named pi, if you want to adhere to the
# default value. SSH keys is probably required anyway to run this
# and to not be prompted for user/pass multiple times.
if [ ! -z $1 ]
then
  SSH_TARGET=$1
else
  SSH_TARGET=pi
fi

# The second argument is the folders location that you want to
# sync to on the device. This is probably the default argument
# as given below, if you are using a UNIX machine and have installed
# the plugin globally.
if [ ! -z $2 ]
then
  SSH_DIR=$2
else
  SSH_DIR=/opt/nodejs/lib/node_modules/homebridge-telldus-tdtool
fi

# Building distribution.
npm run build

# Rsync the distribution folder.
#
# Permissions may be a bit fuzzy iif we want to overwrite the
# write times, therefore this is omitted.
rsync -azP --omit-dir-times dist/ $SSH_TARGET:$SSH_DIR/dist

# Need to restart homebrige to make sure that the changes take effect, and
# that the script is reloaded. This assumes that homebridge is running in
# systemd mode.
#
# How to acheive this is explained here: http://goo.gl/RQPvpn
ssh $SSH_TARGET sudo systemctl restart homebridge
