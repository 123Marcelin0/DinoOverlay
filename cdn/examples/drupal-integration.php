<?php
/**
 * Drupal DinoOverlay Integration Module
 * 
 * This module provides DinoOverlay integration for Drupal sites.
 * Place this file in modules/custom/dino_overlay/dino_overlay.module
 */

/**
 * Implements hook_page_attachments().
 */
function dino_overlay_page_attachments(array &$attachments) {
  $config = \Drupal::config('dino_overlay.settings');
  $api_key = $config->get('api_key');
  
  if (empty($api_key)) {
    return;
  }
  
  // Add DinoOverlay configuration
  $dino_config = [
    'apiKey' => $api_key,
    'apiEndpoint' => $config->get('api_endpoint') ?: 'https://api.dinooverlay.com',
    'theme' => $config->get('theme') ?: 'auto',
    'enableAnalytics' => $config->get('enable_analytics') !== FALSE,
    'debug' => $config->get('debug') === TRUE,
    'customActions' => $config->get('custom_actions') ?: [],
  ];
  
  $attachments['#attached']['drupalSettings']['dinoOverlay'] = $dino_config;
  
  // Add DinoOverlay library
  $attachments['#attached']['library'][] = 'dino_overlay/dino_overlay';
}

/**
 * Implements hook_library_info_build().
 */
function dino_overlay_library_info_build() {
  $libraries = [];
  
  $libraries['dino_overlay'] = [
    'version' => '0.1.0',
    'js' => [
      'https://cdn.dinooverlay.com/v1/dino-overlay-loader-0.1.0.min.js' => [
        'type' => 'external',
        'attributes' => [
          'integrity' => 'sha384-badg/rnYoXzABqabanZK6jAmk5W5ur6718ZERBWPIcuKMywg6T1WggrO5Fz2BbVu',
          'crossorigin' => 'anonymous',
          'async' => TRUE,
        ],
      ],
      drupal_get_path('module', 'dino_overlay') . '/js/dino_overlay.js' => [],
    ],
    'css' => [
      'theme' => [
        drupal_get_path('module', 'dino_overlay') . '/css/dino_overlay.css' => [],
      ],
    ],
    'dependencies' => [
      'core/jquery',
      'core/drupal',
    ],
  ];
  
  return $libraries;
}

/**
 * Implements hook_field_formatter_info().
 */
function dino_overlay_field_formatter_info() {
  return [
    'dino_overlay_image' => [
      'label' => t('DinoOverlay Editable Image'),
      'field types' => ['image'],
      'settings' => [
        'image_style' => '',
        'room_type' => '',
        'enable_overlay' => TRUE,
      ],
    ],
  ];
}

/**
 * Implements hook_field_formatter_settings_form().
 */
function dino_overlay_field_formatter_settings_form($field, $instance, $view_mode, $form, &$form_state) {
  $display = $instance['display'][$view_mode];
  $settings = $display['settings'];
  
  $element = [];
  
  $image_styles = image_style_options(FALSE, PASS_THROUGH);
  $element['image_style'] = [
    '#title' => t('Image style'),
    '#type' => 'select',
    '#default_value' => $settings['image_style'],
    '#empty_option' => t('None (original image)'),
    '#options' => $image_styles,
  ];
  
  $element['room_type'] = [
    '#title' => t('Room Type'),
    '#type' => 'textfield',
    '#default_value' => $settings['room_type'],
    '#description' => t('Specify the room type (e.g., living-room, kitchen, bedroom)'),
  ];
  
  $element['enable_overlay'] = [
    '#title' => t('Enable DinoOverlay'),
    '#type' => 'checkbox',
    '#default_value' => $settings['enable_overlay'],
    '#description' => t('Enable DinoOverlay editing for this image'),
  ];
  
  return $element;
}

/**
 * Implements hook_field_formatter_view().
 */
function dino_overlay_field_formatter_view($entity_type, $entity, $field, $instance, $langcode, $items, $display) {
  $element = [];
  $settings = $display['settings'];
  
  foreach ($items as $delta => $item) {
    if (!empty($item['uri'])) {
      $image = [
        '#theme' => 'image_formatter',
        '#item' => $item,
        '#image_style' => $settings['image_style'],
        '#path' => isset($item['path']) ? $item['path'] : '',
      ];
      
      // Add DinoOverlay classes and attributes
      if ($settings['enable_overlay']) {
        $image['#attributes']['class'][] = 'editable-room';
        
        if (!empty($settings['room_type'])) {
          $image['#attributes']['data-room-type'] = $settings['room_type'];
        }
        
        // Add entity information
        list($entity_id) = entity_extract_ids($entity_type, $entity);
        $image['#attributes']['data-entity-type'] = $entity_type;
        $image['#attributes']['data-entity-id'] = $entity_id;
      }
      
      $element[$delta] = $image;
    }
  }
  
  return $element;
}

/**
 * Implements hook_menu().
 */
function dino_overlay_menu() {
  $items = [];
  
  $items['admin/config/media/dino-overlay'] = [
    'title' => 'DinoOverlay Settings',
    'description' => 'Configure DinoOverlay integration settings.',
    'page callback' => 'drupal_get_form',
    'page arguments' => ['dino_overlay_admin_form'],
    'access arguments' => ['administer site configuration'],
    'file' => 'dino_overlay.admin.inc',
  ];
  
  return $items;
}

/**
 * Form builder for DinoOverlay admin settings.
 */
function dino_overlay_admin_form($form, &$form_state) {
  $config = \Drupal::config('dino_overlay.settings');
  
  $form['api_key'] = [
    '#type' => 'textfield',
    '#title' => t('API Key'),
    '#default_value' => $config->get('api_key'),
    '#description' => t('Enter your DinoOverlay API key.'),
    '#required' => TRUE,
  ];
  
  $form['api_endpoint'] = [
    '#type' => 'textfield',
    '#title' => t('API Endpoint'),
    '#default_value' => $config->get('api_endpoint') ?: 'https://api.dinooverlay.com',
    '#description' => t('DinoOverlay API endpoint URL.'),
  ];
  
  $form['theme'] = [
    '#type' => 'select',
    '#title' => t('Theme'),
    '#default_value' => $config->get('theme') ?: 'auto',
    '#options' => [
      'auto' => t('Auto'),
      'light' => t('Light'),
      'dark' => t('Dark'),
    ],
    '#description' => t('Choose the overlay theme.'),
  ];
  
  $form['enable_analytics'] = [
    '#type' => 'checkbox',
    '#title' => t('Enable Analytics'),
    '#default_value' => $config->get('enable_analytics') !== FALSE,
    '#description' => t('Enable DinoOverlay usage analytics.'),
  ];
  
  $form['debug'] = [
    '#type' => 'checkbox',
    '#title' => t('Debug Mode'),
    '#default_value' => $config->get('debug') === TRUE,
    '#description' => t('Enable debug logging (only for development).'),
  ];
  
  return system_settings_form($form);
}

/**
 * Implements hook_form_FORM_ID_alter() for node forms.
 */
function dino_overlay_form_node_form_alter(&$form, &$form_state, $form_id) {
  // Add DinoOverlay settings to content types with image fields
  $node = $form_state['node'];
  
  if (isset($form['field_images'])) {
    $form['dino_overlay'] = [
      '#type' => 'fieldset',
      '#title' => t('DinoOverlay Settings'),
      '#collapsible' => TRUE,
      '#collapsed' => TRUE,
      '#group' => 'additional_settings',
    ];
    
    $form['dino_overlay']['enable_dino_overlay'] = [
      '#type' => 'checkbox',
      '#title' => t('Enable DinoOverlay for this content'),
      '#default_value' => isset($node->dino_overlay_enabled) ? $node->dino_overlay_enabled : FALSE,
      '#description' => t('Allow images in this content to be edited with DinoOverlay.'),
    ];
  }
}

/**
 * Implements hook_node_presave().
 */
function dino_overlay_node_presave($node) {
  if (isset($node->enable_dino_overlay)) {
    $node->dino_overlay_enabled = $node->enable_dino_overlay;
  }
}
?>