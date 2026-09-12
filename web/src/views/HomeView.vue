<script setup>
import HeroSection from '../components/HeroSection.vue'
import TickerBar from '../components/TickerBar.vue'
import PromiseGrid from '../components/PromiseGrid.vue'
import FeaturedSlider from '../components/FeaturedSlider.vue'
import SetsSection from '../components/SetsSection.vue'
import StorySection from '../components/StorySection.vue'
import OrderSteps from '../components/OrderSteps.vue'
import ContactSection from '../components/ContactSection.vue'

defineEmits(['add', 'add-set', 'peek'])
</script>

<template>
  <!--
    The front page carries what a first-time visitor needs: what the shop is,
    what is on offer, and what people actually buy. The full catalogue lives on
    its own page — fifty-four products is a place you go to, not something to
    scroll past on the way to the phone number.
  -->
  <HeroSection />
  <TickerBar />
  <PromiseGrid />
  <SetsSection @add="$emit('add-set', $event)" />
  <FeaturedSlider @add="$emit('add', $event)" @peek="$emit('peek', $event)" />
  <StorySection />
  <OrderSteps />
  <ContactSection />
</template>
