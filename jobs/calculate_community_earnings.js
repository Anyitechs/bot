const { Order, Community } = require('../models');
const { logger } = require('../logger');

const calculateEarnings = async () => {
  try {
    const orders = await Order.find({
      status: 'SUCCESS',
      community_id: { $ne: null },
      calculated: false,
    });
    const earningsMap = new Map();
    for (const order of orders) {
      const amount = order.amount;
      const fee = order.fee;
      const botFee = order.bot_fee || parseFloat(process.env.MAX_FEE);
      const communityFeePercent =
        order.community_fee || parseFloat(process.env.FEE_PERCENT);
      const maxFee = amount * botFee;
      const communityFee = fee - maxFee * communityFeePercent;
      const earnings = earningsMap.get(order.community_id) || [0, 0];
      earningsMap.set(order.community_id, [
        earnings[0] + communityFee,
        earnings[1] + 1,
      ]);
      order.calculated = true;
      await order.save();
    }
    for (const [communityId, earnings] of earningsMap) {
      const community = await Community.findById(communityId);
      const amount = Math.round(earnings[0]);
      community.earnings = community.earnings + amount;
      community.orders_to_redeem = community.orders_to_redeem + earnings[1];
      await community.save();
      logger.info(
        `New earnings for community Id: ${community.id} sats: ${amount} orders calculated: ${earnings[1]}`
      );
    }
  } catch (error) {
    const message = error.toString();
    logger.error(`calculateEarnings catch error: ${message}`);
  }
};

module.exports = calculateEarnings;
